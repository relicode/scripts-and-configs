---
name: review-rust
description: Rust review specifics. Grades violations of the project's Rust rule into the review categories: unsafe whose safety argument doesn't hold and panics input can reach as Correctness findings, shell and argument injection as Security, and blocking calls, locks held across .await and unhandled tasks as Bad practices. Use together with review-generic and best-practices-rust when reviewing Rust; preloaded by reviewer-rust.
---

# Code review: Rust

Extends `review-generic`: same scope, phases and report, plus the grading below.

The standards are the project rules `rust.md` and `lint-and-format.md` in `.claude/rules/rust/`. They load for the files in scope, so check against them there and validate the way `lint-and-format.md` describes.

## How to grade

Violations of `rust.md` land in review-generic's categories like this:

- Its "Unsafe" rules are **Correctness** findings: check every `SAFETY` comment against the code it covers, and grade 🔴 where safe code can reach undefined behavior through it. Replacing `unsafe` with a safe API is a fix; adding `unsafe` for speed is a decision to confirm.
- Its "Errors and panics" rules are **Correctness** findings where input the code doesn't control can reach them, graded like any other crash: an `unwrap()`, `expect()`, index, slice or division that can panic, arithmetic that can overflow, an `as` cast that can truncate. A silently discarded `Result` is one too.
- Its "Async" rules: a lock held across an `.await` that can deadlock is a **Correctness** finding; blocking calls and unhandled tasks are **Bad practices** ones.
- Its "Processes" rules: shell and argument injection is a **Security** finding, and a child that isn't waited for or drained, or whose exit status goes unchecked, is a **Bad practices** one.
- Its "Standard library first" rules are **Bad practices** findings for new code; a swap of a dependency the project already relies on goes under Decisions to confirm.
- `best-practices-rust` is the performance guide for this code; grade what it turns up as review-generic's "Performance rules from a best-practices skill" says.
