---
name: develop-rust
description: Rust development specifics for libraries, command-line tools and async services. Names the project's Rust and lint-and-format rules as the standards and adds what the procedure needs on top of them: how to treat a standard-library API that would replace an existing dependency, when adding unsafe is a decision rather than a task, and which best-practices skill covers the code. Use together with develop-generic and best-practices-rust when implementing Rust; preloaded by developer-rust.
---

# Development: Rust

Extends `develop-generic`: same scope, procedure and report.

The standards are the project rules `rust.md` and `lint-and-format.md` in `.claude/rules/rust/`. They load for the files you'll touch, so follow them there rather than looking for a second copy here, and validate the way `lint-and-format.md` describes.

## What this stack adds

- Write for the crate's `edition` and `rust-version`, and reach for the standard-library API wherever `rust.md` lists one. Replacing a dependency the project already relies on isn't part of the task: name the standard alternative under Decisions instead of making the swap.
- Adding `unsafe` is a decision, not an implementation detail. Where a safe API does the job, use it; where the task genuinely needs `unsafe`, write the `SAFETY` argument `rust.md` requires and put the block under Decisions with what motivated it.
- `best-practices-rust` is the performance guide for this code.
