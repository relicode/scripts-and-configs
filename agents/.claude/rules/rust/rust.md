---
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
---

# Rust

In a file or module with an established style, that style wins over these rules, within the limits "Existing style wins" in `.claude/rules/clean-code.md` sets.

## Toolchain

- Write for the crate's `edition` and `rust-version` in `Cargo.toml`: no language feature or standard library API newer than `rust-version`. Let chains, for example, need the 2024 edition and Rust 1.88. Clippy reads `rust-version` too and holds back suggestions that need a newer Rust.
- Add a dependency with `cargo add`, which updates `Cargo.lock` as well. Keep its default features unless the project turns them off, and add only the features the code uses. In a workspace with `[workspace.dependencies]`, declare it there by hand first: `cargo add -p <member> <name>` then inherits it with `<name>.workspace = true`.
- Look up a crate's API for the version `Cargo.lock` pins, through context7 or on docs.rs: APIs change between versions, and some sit behind features.

## Naming

- `snake_case` for functions, methods, variables, modules and their files, `UpperCamelCase` for types, traits and enum variants, and `SCREAMING_SNAKE_CASE` for constants and statics. Acronyms count as one word: `HttpClient`, `Uuid`. A file in `src/bin/` is named after the command it builds, dashes included.
- Follow the Rust API Guidelines where they differ from `.claude/rules/clean-code.md`: getters drop the `get_` prefix (`fn name(&self)`), and conversions start with `as_` when they're cheap and borrow, `to_` when they're expensive, and `into_` when they consume `self`.

## Types and ownership

- Take a parameter by reference when the function only reads it, as the general borrowed type: `&str`, `&[T]` and `&Path`, not `&String`, `&Vec<T>` or `&PathBuf`. Take ownership only when the function keeps or consumes the value, and pass small `Copy` types, such as integers and ID newtypes, by value.
- Model states and choices as enums, not as strings, `bool` parameters, or several `bool`s that together encode one state, and wrap IDs and units in newtypes where two could be mixed up: `struct UserId(u64)`.
- Derive `Debug` on every public type, or implement it by hand to redact a field that holds a secret. Derive `Clone`, `PartialEq`, `Eq`, `Hash` and `Default` where they make sense for the type, and `Copy` for small value types such as IDs.

## Errors and panics

- Return `Result` from anything that can fail at run time, and propagate errors with `?`. Panic only on a broken invariant, where a bug and not the input got the code there.
- No `unwrap()` outside tests. Where a value can't be missing, use `expect` with a message that says why: `expect("the pattern is a valid literal")`.
- Where input decides the numbers, guard what panics or silently goes wrong: indexing and slicing out of range, slicing a string inside a character, division by zero, overflowing arithmetic, which panics in debug builds and wraps in release ones, and `as` casts, which truncate. Use `get`, `checked_*`, `saturating_*` and `TryFrom` there.
- Libraries return error types of their own, usually an enum (with `thiserror` where the project has it), so callers can match on them. Applications may use one catch-all type (`anyhow` where the project has it) and add context while propagating: `.with_context(|| format!("reading {}", path.display()))`.
- Never discard an error silently: a `Result` dropped with `let _ =`, `.ok()` or `unwrap_or_default()` needs handling, or a comment saying why the failure doesn't matter.
- No `todo!()`, `unimplemented!()` or `dbg!()` in finished code.

## Unsafe

- Write `unsafe` only when the task needs it and no safe API does the job, and keep each `unsafe` block as small as the operation that needs it.
- Every `unsafe` block and `unsafe impl` gets a `// SAFETY:` comment saying why each invariant it relies on holds, and every `unsafe fn` and `unsafe trait` a `# Safety` section in its docs saying what callers or implementors must uphold.

## Async

- Stay on the project's async runtime; don't add a second one.
- Never block an async task: no `std::thread::sleep`, blocking file or network I/O, or long computations in async code. Use the runtime's async APIs, and move blocking work to `spawn_blocking`.
- Don't hold a `std::sync::Mutex` guard or a `RefCell` borrow across an `.await`: drop it first. Where the lock has to span the `.await`, use the runtime's async mutex.
- Await or explicitly handle every future and spawned task. A future does nothing until it's polled, and dropping a `JoinHandle` detaches its task, whose errors and panics then go unnoticed.

## Processes

`std::process::Command` starts no shell and passes each `arg` as one argument, so shell metacharacters in it do nothing. That stops shell injection and nothing else:

- Never build a command line for `sh -c`, `bash -c` or `cmd /C` from untrusted values.
- Validate untrusted values that can start with `-`, or end the options before them the way the command expects (`--`, or git's `--end-of-options` before revisions): they otherwise become options such as `--output=…`.
- Never take the program itself, its working directory or its environment from untrusted input.
- `status()` and `output()` return `Ok` even when the program fails, so check `status.success()`. Wait for every `Child` you `spawn()`, since dropping it neither stops the process nor reaps it, and read its piped stdout and stderr while it runs, as `output()` and `wait_with_output()` do: a child blocked on a full pipe never exits.

## Standard library first

In new code, prefer the standard library where `rust-version` allows it:

| Task | Use | Instead of |
| --- | --- | --- |
| Lazily initialized statics | `std::sync::LazyLock` (1.80), `OnceLock` (1.70) | `lazy_static`, `once_cell` |
| Whether a stream is a terminal | `std::io::IsTerminal` (1.70) | `atty`, `is-terminal` |
| Threads that borrow from the caller | `std::thread::scope` (1.63) | `crossbeam::scope` |
| Async methods in traits | `async fn` in the trait (1.75) | `async-trait`, unless the trait is used as `dyn Trait` |

In a `pub` trait, rustc warns about `async fn`, since callers can't require its future to be `Send`: declare `fn name(…) -> impl Future<Output = T> + Send` there, which implementations can still write as `async fn`. Don't replace a dependency the project already relies on unless asked; mention the standard alternative instead.

## Binaries

Cargo compiles `src/main.rs` and `src/bin/` into binaries, so they aren't scripts in the sense of `.claude/rules/scripts.md` and get no shebang or executable bit. A command-line binary still prints its usage on `-h` and `--help` and exits with code 0, which clap does by itself.
