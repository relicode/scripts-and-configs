---
name: best-practices-rust
description: Performance practices for Rust. Covers blocking and sequential awaits in async code, lock scope, buffered I/O, reused clients and batched queries, needless clones and allocations, and hot-path techniques such as index maps, the entry API, lazy iterators and regexes built once. Use when writing or reviewing performance-sensitive Rust; preloaded by developer-rust and reviewer-rust.
---

# Best practices: Rust performance

Performance rules for Rust, grouped by impact.

Written for this setup, drawing on [The Rust Performance Book](https://nnethercote.github.io/perf-book/) by Nicholas Nethercote and on Clippy's lints; the wording and examples are our own.

## Applying them

- Fix what the code shows. Don't add caching, `unsafe` or micro-optimizations on speculation: measure, and spend effort where it matters. Judge speed only from release builds, which can run many times faster than debug ones. The hot-path rules only pay off in code that runs often.
- Clippy's `perf` lints, on by default, catch some performance mistakes by themselves; these rules cover patterns its default lints don't see.
- Some rules name crates, such as `futures` for bounded concurrency and `rustc-hash` for a faster hasher. Use them where the project already has them; in a review, or in a developer agent's change that didn't ask for one, adding one is a decision to confirm.

## Rules

The full rules, with incorrect and correct examples, are in `references/rust-performance-guidelines.md` in this skill's base directory.

1. **Async and concurrency** (CRITICAL): a blocked worker thread stalls every task queued on it, and each sequential `.await` adds the full latency of what it waits for.
   - Never block the async runtime: async APIs, and `spawn_blocking` for the rest
   - `try_join!` and `join!` for independent futures
   - A bounded number of futures at a time for many items
   - Hold locks only for the read or write itself
2. **I/O** (HIGH):
   - `BufReader` and `BufWriter` for small reads and writes
   - Lock stdout once for many lines
   - Reuse HTTP clients and connection pools
   - One query for many items instead of one per item
3. **Allocations** (MEDIUM):
   - Borrow instead of cloning
   - Pre-size collections, or let `collect()` do it
   - `write!` into one buffer instead of a `format!` per piece
4. **Hot paths** (LOW-MEDIUM):
   - Index maps instead of repeated `find()`
   - The entry API instead of a lookup and an insert
   - `HashSet` for repeated membership checks
   - Iterate lazily and stop early: `count()`, `any()`, `find()`
   - Build regexes once, in a `LazyLock`
   - `sort_unstable()` where equal elements can change places
   - `min_by_key()` and `max_by_key()` instead of sorting
   - A faster hasher for maps with trusted keys
