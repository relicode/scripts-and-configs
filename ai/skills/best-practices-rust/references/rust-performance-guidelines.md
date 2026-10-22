# Rust Performance Guidelines

Rules for Rust wherever it runs: command-line tools, libraries and async services. The async examples use tokio, the most common runtime; the others offer the same tools under other names.

Written for this setup, drawing on [The Rust Performance Book](https://nnethercote.github.io/perf-book/) by Nicholas Nethercote and on Clippy's lints; the wording and examples are our own. The examples follow the house rules in `.claude/rules/rust/`, and use `anyhow` for brevity where errors of several types meet.

---

## Contents

1. [Async and Concurrency](#1-async-and-concurrency) — **CRITICAL**
   - 1.1 Never Block the Async Runtime
   - 1.2 Join Independent Futures
   - 1.3 Run Many Futures with a Bound
   - 1.4 Hold Locks Briefly
2. [I/O](#2-io) — **HIGH**
   - 2.1 Buffer Small Reads and Writes
   - 2.2 Lock Stdout Once for Many Lines
   - 2.3 Reuse Clients and Connection Pools
   - 2.4 One Query for Many Items
3. [Allocations](#3-allocations) — **MEDIUM**
   - 3.1 Borrow Instead of Cloning
   - 3.2 Pre-size Collections
   - 3.3 Write Into One Buffer
4. [Hot Paths](#4-hot-paths) — **LOW-MEDIUM**
   - 4.1 Index Maps for Repeated Lookups
   - 4.2 The Entry API Instead of a Lookup and an Insert
   - 4.3 HashSet for Membership Checks
   - 4.4 Iterate Lazily and Stop Early
   - 4.5 Build Regexes Once
   - 4.6 sort_unstable() Where Equal Elements Can Change Places
   - 4.7 One Pass for Min and Max
   - 4.8 A Faster Hasher for Trusted Keys

---

## 1. Async and Concurrency

**Impact: CRITICAL**

An async runtime runs many tasks on a few threads. A task that blocks its thread stalls every task queued behind it, and each `.await` on work that could have run alongside other work adds that work's full latency.

### 1.1 Never Block the Async Runtime

Blocking calls hold the worker thread until they return: `std::fs`, `std::net`, `std::thread::sleep`, synchronous HTTP and database clients, and long computations. As a rule of thumb, a task shouldn't run for more than 10 to 100 microseconds between two `.await`s. Use the runtime's async APIs, and move what has no async version to `spawn_blocking`.

**Incorrect: reads and hashes the file on the worker thread**

```rust
async fn checksum(path: &Path) -> anyhow::Result<String> {
    let bytes = std::fs::read(path)?;
    Ok(sha256_hex(&bytes))
}
```

**Correct: reads and hashes on the blocking pool, in one call**

```rust
async fn checksum(path: &Path) -> anyhow::Result<String> {
    let path = path.to_owned();
    tokio::task::spawn_blocking(move || Ok(sha256_hex(&std::fs::read(path)?))).await?
}
```

`tokio::fs` runs each of its calls on that same pool, so a sequence of file operations costs less as one `spawn_blocking` call. For long CPU-bound work, such as resizing images, a rayon thread pool fits better where the project has rayon.

### 1.2 Join Independent Futures

When futures don't depend on each other, await them together.

**Incorrect: three round trips, one after another**

```rust
async fn load_dashboard(id: UserId) -> anyhow::Result<Dashboard> {
    let user = fetch_user(id).await?;
    let orders = fetch_orders(id).await?;
    let settings = fetch_settings(id).await?;
    Ok(Dashboard {
        user,
        orders,
        settings,
    })
}
```

**Correct: the three run at once**

```rust
async fn load_dashboard(id: UserId) -> anyhow::Result<Dashboard> {
    let (user, orders, settings) =
        tokio::try_join!(fetch_user(id), fetch_orders(id), fetch_settings(id))?;
    Ok(Dashboard {
        user,
        orders,
        settings,
    })
}
```

`try_join!` returns the first error and drops the other futures, which cancels them; `join!` waits for all of them. Both poll the futures concurrently within the current task, which is enough for I/O; to use more than one thread, `tokio::spawn` each future and join the handles.

### 1.3 Run Many Futures with a Bound

Awaiting the items of a list one at a time is the same waterfall, and starting them all at once can overload the server on the other end, or your own memory. Run a fixed number at a time.

**Incorrect: one request at a time**

```rust
async fn fetch_pages(urls: &[String]) -> anyhow::Result<Vec<Page>> {
    let mut pages = Vec::with_capacity(urls.len());
    for url in urls {
        pages.push(fetch_page(url).await?);
    }
    Ok(pages)
}
```

**Correct: up to eight at a time**

```rust
use futures::{StreamExt, TryStreamExt};

const MAX_CONCURRENT_FETCHES: usize = 8;

async fn fetch_pages(urls: &[String]) -> anyhow::Result<Vec<Page>> {
    futures::stream::iter(urls)
        .map(|url| fetch_page(url))
        .buffered(MAX_CONCURRENT_FETCHES)
        .try_collect()
        .await
}
```

`buffered` keeps the input order, and `buffer_unordered` yields results as they complete. Both come from the `futures` crate. Without it, a `tokio::task::JoinSet`, with a `tokio::sync::Semaphore` capping how many tasks run, spreads the work over several threads, but it returns results as they finish, like `buffer_unordered`, and its tasks need owned inputs.

### 1.4 Hold Locks Briefly

A lock held during slow work makes every other thread or task that needs it wait for that work too. Hold the guard only to read or change the shared value.

**Incorrect: holds the lock while writing to disk**

```rust
fn save_snapshot(state: &Mutex<State>, path: &Path) -> anyhow::Result<()> {
    let state = state
        .lock()
        .expect("no code panics while holding the state lock");
    std::fs::write(path, serde_json::to_vec(&*state)?)?;
    Ok(())
}
```

**Correct: serializes under the lock, then writes without it**

```rust
fn save_snapshot(state: &Mutex<State>, path: &Path) -> anyhow::Result<()> {
    let bytes = {
        let state = state
            .lock()
            .expect("no code panics while holding the state lock");
        serde_json::to_vec(&*state)?
    };
    std::fs::write(path, bytes)?;
    Ok(())
}
```

The guard is dropped at the end of its block. In async code, holding a `std::sync::Mutex` guard across an `.await` can also deadlock: `.claude/rules/rust/rust.md` forbids it.

---

## 2. I/O

**Impact: HIGH**

A system call or a network round trip costs far more than the code around it, so the number of them decides the speed of I/O-heavy code. These rules matter where that number grows with the data: a write per line, a request per item, a query per row. A few writes or calls in total need none of them.

### 2.1 Buffer Small Reads and Writes

`File`, `TcpStream` and a child process's pipes make a system call for every `read` and `write`, and one `write!` can make several. Wrap them in `BufReader` and `BufWriter` when you read or write in small pieces.

**Incorrect: at least one system call per row**

```rust
fn write_report(path: &Path, rows: &[Row]) -> io::Result<()> {
    let mut file = File::create(path)?;
    for row in rows {
        writeln!(file, "{},{}", row.name, row.total)?;
    }
    Ok(())
}
```

**Correct: buffered, and flushed once at the end**

```rust
fn write_report(path: &Path, rows: &[Row]) -> io::Result<()> {
    let mut file = BufWriter::new(File::create(path)?);
    for row in rows {
        writeln!(file, "{},{}", row.name, row.total)?;
    }
    file.flush()
}
```

Call `flush()` and handle its result: dropping a `BufWriter` flushes too, but ignores any error, so a full disk would go unnoticed. Reading a whole file with `fs::read` or `fs::read_to_string` needs no buffer, and tokio has its own `BufReader` and `BufWriter` for async I/O.

### 2.2 Lock Stdout Once for Many Lines

`println!` locks stdout on every call, and stdout flushes at every newline, so each printed line costs a lock and a system call.

**Incorrect: a lock and a write per line**

```rust
fn print_entries(entries: &[Entry]) {
    for entry in entries {
        println!("{}\t{}", entry.size, entry.path.display());
    }
}
```

**Correct: one lock, and writes in large blocks**

```rust
fn print_entries(entries: &[Entry]) -> io::Result<()> {
    let mut out = BufWriter::new(io::stdout().lock());
    for entry in entries {
        writeln!(out, "{}\t{}", entry.size, entry.path.display())?;
    }
    out.flush()
}
```

Keep progress messages that should appear as they happen unbuffered. When the reader goes away, as `head` does at the end of a pipe, `writeln!` returns a `BrokenPipe` error where `println!` would panic: treat that error as a quiet end.

### 2.3 Reuse Clients and Connection Pools

HTTP clients and database pools keep connections open to reuse them. Building one per request pays for a new connection, TLS handshake included, every time.

**Incorrect: a new client, and a new connection, for every call**

```rust
async fn fetch_rates(url: &str) -> reqwest::Result<Rates> {
    reqwest::Client::new().get(url).send().await?.json().await
}
```

**Correct: one client, built at startup and passed in**

```rust
async fn fetch_rates(client: &reqwest::Client, url: &str) -> reqwest::Result<Rates> {
    client.get(url).send().await?.json().await
}
```

A `reqwest::Client` is reference-counted inside, so its clones are cheap and share one pool. Keep it in the application's state, like a database pool such as `sqlx::PgPool`, which works the same way.

### 2.4 One Query for Many Items

A query per item in a loop pays one database round trip per item, the N+1 query problem. Fetch them all with one query.

**Incorrect: one round trip per order**

```rust
async fn load_customers(db: &Db, orders: &[Order]) -> anyhow::Result<Vec<Customer>> {
    let mut customers = Vec::with_capacity(orders.len());
    for order in orders {
        customers.push(db.customer_by_id(order.customer_id).await?);
    }
    Ok(customers)
}
```

**Correct: one round trip in total**

```rust
async fn load_customers(db: &Db, orders: &[Order]) -> anyhow::Result<Vec<Customer>> {
    let ids: Vec<CustomerId> = orders.iter().map(|order| order.customer_id).collect();
    db.customers_by_ids(&ids).await
}
```

In SQL, that's one statement with the IDs bound as a parameter, such as `WHERE id = ANY($1)` in Postgres, never formatted into the query string. The rows come back once per customer, in the database's order, and a missing customer is no longer an error: where the caller needs them per order, or needs every one, match them up with an index map (4.1) and check for missing IDs. HTTP APIs with batch endpoints work the same way.

---

## 3. Allocations

**Impact: MEDIUM**

Every new `String`, `Vec`, `Box` or `HashMap`, and every clone of one, allocates on the heap. One doesn't matter; one per item in a hot loop does.

### 3.1 Borrow Instead of Cloning

A function that only reads its input should borrow it. Taking `String` or `Vec<T>` makes every caller that still needs the value clone it.

**Incorrect: callers clone the name and the orders to call it**

```rust
fn total_for(customer: String, orders: Vec<Order>) -> u64 {
    orders
        .iter()
        .filter(|order| order.customer == customer)
        .map(|order| order.amount)
        .sum()
}
```

**Correct: borrows both**

```rust
fn total_for(customer: &str, orders: &[Order]) -> u64 {
    orders
        .iter()
        .filter(|order| order.customer == customer)
        .map(|order| order.amount)
        .sum()
}
```

When several threads or tasks need the same large value, share it in an `Arc`, whose clones copy a pointer, instead of cloning the value for each. A function that usually returns its input unchanged can return a `Cow<str>`, which borrows the input and allocates only when it changes it.

### 3.2 Pre-size Collections

A `Vec` that grows one `push` at a time reallocates and copies its contents whenever it outgrows its capacity.

**Incorrect: reallocates as it grows**

```rust
fn label_items(items: &[Item]) -> Vec<String> {
    let mut labels = Vec::new();
    for item in items {
        labels.push(format!("{} ({})", item.name, item.count));
    }
    labels
}
```

**Correct: `collect()` allocates once, since `map` keeps the length known**

```rust
fn label_items(items: &[Item]) -> Vec<String> {
    items
        .iter()
        .map(|item| format!("{} ({})", item.name, item.count))
        .collect()
}
```

Where a loop reads better, start from `Vec::with_capacity(items.len())`; `String`, `HashMap` and `HashSet` have `with_capacity` too. After a `filter`, the final length isn't known, so `collect()` grows the vector as it goes.

### 3.3 Write Into One Buffer

`format!` allocates a new `String` every time. To build one string from many pieces, `write!` into a single buffer.

**Incorrect: a new string per row, then copied into the result**

```rust
fn format_totals(rows: &[Row]) -> String {
    let mut text = String::new();
    for row in rows {
        text.push_str(&format!("{}: {}\n", row.name, row.total));
    }
    text
}
```

**Correct: every row goes straight into the buffer**

```rust
use std::fmt::Write;

fn format_totals(rows: &[Row]) -> String {
    let mut text = String::new();
    for row in rows {
        writeln!(text, "{}: {}", row.name, row.total).expect("writing to a String never fails");
    }
    text
}
```

When a loop needs a scratch `String` or `Vec`, create it once before the loop and `clear()` it in each iteration: clearing keeps the capacity it has grown to.

---

## 4. Hot Paths

**Impact: LOW-MEDIUM**

These pay off in code that runs often: loops over large data, request handlers under load, parsers. Elsewhere, write whatever reads most clearly.

### 4.1 Index Maps for Repeated Lookups

Several `find()` calls by the same key should use a `HashMap`.

**Incorrect: O(n) per lookup**

```rust
fn build_invoice(orders: &[Order], customers: &[Customer]) -> Vec<InvoiceLine> {
    orders
        .iter()
        .map(|order| {
            let customer = customers
                .iter()
                .find(|customer| customer.id == order.customer_id);
            InvoiceLine::new(order, customer)
        })
        .collect()
}
```

**Correct: the map is built once, then each lookup is O(1)**

```rust
fn build_invoice(orders: &[Order], customers: &[Customer]) -> Vec<InvoiceLine> {
    let customer_by_id: HashMap<CustomerId, &Customer> = customers
        .iter()
        .map(|customer| (customer.id, customer))
        .collect();
    orders
        .iter()
        .map(|order| InvoiceLine::new(order, customer_by_id.get(&order.customer_id).copied()))
        .collect()
}
```

For 1,000 orders and 1,000 customers, that's about 2,000 operations instead of a million.

### 4.2 The Entry API Instead of a Lookup and an Insert

**Incorrect: a second lookup for every new word**

```rust
fn count_words(text: &str) -> HashMap<&str, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        if let Some(count) = counts.get_mut(word) {
            *count += 1;
        } else {
            counts.insert(word, 1);
        }
    }
    counts
}
```

**Correct: one lookup per word**

```rust
fn count_words(text: &str) -> HashMap<&str, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word).or_default() += 1;
    }
    counts
}
```

`entry` takes its key by value, so with owned keys, as in `counts.entry(word.to_owned())`, it allocates even when the key is already there. When most keys repeat, keep `get_mut` and allocate only for the insert.

### 4.3 HashSet for Membership Checks

Turn a list into a `HashSet`, or a `HashMap` when you need values, before checking membership in it repeatedly.

**Incorrect: O(n) per check**

```rust
fn drop_blocked(requests: Vec<Request>, blocklist: &[IpAddr]) -> Vec<Request> {
    requests
        .into_iter()
        .filter(|request| !blocklist.contains(&request.ip))
        .collect()
}
```

**Correct: O(1) per check**

```rust
fn drop_blocked(requests: Vec<Request>, blocklist: &[IpAddr]) -> Vec<Request> {
    let blocked: HashSet<IpAddr> = blocklist.iter().copied().collect();
    requests
        .into_iter()
        .filter(|request| !blocked.contains(&request.ip))
        .collect()
}
```

Building the set costs a pass over the list, so it pays off when many items are checked against it; for a list that doesn't change, build the set once, at startup or in a `LazyLock` (4.5). For a handful of fixed values, a `match` or a short slice is as fast or faster.

### 4.4 Iterate Lazily and Stop Early

Iterator adapters do no work until something consumes them. Collecting into a `Vec` only to count or search it allocates for nothing, and counting every match to learn whether there is one keeps going after the answer is known.

**Incorrect: builds a vector to count it, and counts every admin to find one**

```rust
fn summarize(users: &[User]) -> (usize, bool) {
    let active_count = users
        .iter()
        .filter(|user| user.is_active)
        .collect::<Vec<_>>()
        .len();
    let has_admin = users.iter().filter(|user| user.is_admin).count() > 0;
    (active_count, has_admin)
}
```

**Correct: counts without allocating, and stops at the first admin**

```rust
fn summarize(users: &[User]) -> (usize, bool) {
    let active_count = users.iter().filter(|user| user.is_active).count();
    let has_admin = users.iter().any(|user| user.is_admin);
    (active_count, has_admin)
}
```

`find`, `position` and `all` stop early the same way. A function whose callers only loop over its result can return `impl Iterator<Item = T>` instead of collecting into a `Vec`.

### 4.5 Build Regexes Once

Compiling a regex costs far more than matching with it. Build a fixed pattern once, in a `LazyLock` static.

**Incorrect: compiles the pattern on every call**

```rust
fn is_slug(text: &str) -> bool {
    Regex::new("^[a-z0-9-]+$")
        .expect("the pattern is a valid literal")
        .is_match(text)
}
```

**Correct: compiles it on first use, and shares it after that**

```rust
static SLUG_PATTERN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new("^[a-z0-9-]+$").expect("the pattern is a valid literal"));

fn is_slug(text: &str) -> bool {
    SLUG_PATTERN.is_match(text)
}
```

A pattern built from input can't be a static, but build it once per input, not once per item. `LazyLock` needs Rust 1.80; under an older `rust-version`, use `OnceLock` (1.70), or the `once_cell` crate where the project has it.

### 4.6 sort_unstable() Where Equal Elements Can Change Places

`sort()` is stable: it keeps equal elements in their original order, and allocates a buffer to do so. `sort_unstable()` sorts in place without allocating, and is usually faster.

**Incorrect: pays for a stability nothing needs**

```rust
fn unique_ids(mut ids: Vec<u64>) -> Vec<u64> {
    ids.sort();
    ids.dedup();
    ids
}
```

**Correct: sorts in place**

```rust
fn unique_ids(mut ids: Vec<u64>) -> Vec<u64> {
    ids.sort_unstable();
    ids.dedup();
    ids
}
```

Keep `sort()` and `sort_by_key()` where the order of equal elements matters, such as a second sort meant to keep the order of the first among ties.

### 4.7 One Pass for Min and Max

Finding the smallest or largest item takes one pass; sorting does far more work, here on a copy too.

**Incorrect: O(n log n), and an allocation, to find one item**

```rust
fn latest(releases: &[Release]) -> Option<&Release> {
    let mut sorted: Vec<&Release> = releases.iter().collect();
    sorted.sort_by_key(|release| release.published_at);
    sorted.last().copied()
}
```

**Correct: O(n), no allocation**

```rust
fn latest(releases: &[Release]) -> Option<&Release> {
    releases.iter().max_by_key(|release| release.published_at)
}
```

On ties, `max_by_key` returns the last of the equal items and `min_by_key` the first.

### 4.8 A Faster Hasher for Trusted Keys

`HashMap` and `HashSet` hash with SipHash by default, which resists flooding attacks with keys an attacker picks, at a cost for small keys such as integers. In a hot map whose keys don't come from untrusted input, a faster hasher such as `FxHashMap` from the `rustc-hash` crate speeds up every lookup.

```rust
use rustc_hash::FxHashMap;

fn count_degrees(edges: &[(NodeId, NodeId)]) -> FxHashMap<NodeId, u32> {
    let mut degrees = FxHashMap::default();
    for (from, to) in edges {
        *degrees.entry(*from).or_default() += 1;
        *degrees.entry(*to).or_default() += 1;
    }
    degrees
}
```

Keep the default hasher for keys from requests, files or anything else outside your control. `rustc-hash` is a new dependency unless the project has it already: confirm before adding it.

---

## References

1. [The Rust Performance Book](https://nnethercote.github.io/perf-book/)
2. [Clippy's lints](https://rust-lang.github.io/rust-clippy/stable/index.html)
3. [Async: What is blocking?](https://ryhl.io/blog/async-what-is-blocking/), by Alice Ryhl
4. [tokio::task::spawn_blocking](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html)
