---
name: review-rust
description: Rust review specifics. Checks the change against the project's Rust rules and the best-practices-rust performance rules, and for unsafe code whose safety argument doesn't hold, panics that input can reach, blocking calls and locks held across .await in async code, and shell and argument injection through std::process::Command. Use together with review-generic and best-practices-rust when reviewing Rust; preloaded by reviewer-rust.
---

# Code review: Rust

Extends `review-generic`: same scope, phases and report, plus the checks below. The standards are the project rules `rust.md` and `lint-and-format.md` in `.claude/rules/rust/`; validate the way `lint-and-format.md` describes.

## Extra checks

- **Unsafe.** Check every `SAFETY` comment against the code it covers. `unsafe` without one, or with an argument that doesn't hold, is a **Correctness** finding, 🔴 where safe code can reach undefined behavior through it. Replacing `unsafe` with a safe API is a fix; adding `unsafe` for speed is a decision to confirm.
- **Panics.** An `unwrap()`, `expect()`, index, slice or division that input the code doesn't control can make panic is a **Correctness** finding, graded like any other crash. So is arithmetic that such input can overflow, which panics in debug builds and wraps around in release ones, and an `as` cast that truncates it.
- **Async.** Code that breaks the "Async" rules in `rust.md`: a lock held across an `.await` that can deadlock is a **Correctness** finding; blocking calls and unhandled tasks are **Bad practices** ones.
- **Processes.** Code that breaks the "Processes" rules in `rust.md`: shell and argument injection is a **Security** finding, and a child process that isn't waited for or drained, or whose exit status goes unchecked, is a **Bad practices** one.

## Performance findings

Check the change against the `best-practices-rust` rules. The full rules, with incorrect and correct examples, are in `references/rust-performance-guidelines.md` in that skill's base directory. Record problems in the **Bad practices** category, graded on review-generic's scale so 🔴 means the same thing in every report: a CRITICAL or HIGH rule broken on a real code path is 🟠, anything lower is 🟡. Fixes that need a new dependency go under Decisions to confirm.
