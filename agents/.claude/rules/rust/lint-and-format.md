---
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
  - "**/clippy.toml"
  - "**/.clippy.toml"
  - "**/rustfmt.toml"
  - "**/.rustfmt.toml"
---

# Lint and format

Rust projects format with rustfmt, lint with [Clippy](https://github.com/rust-lang/rust-clippy) and test with `cargo test`. Where a project wraps them in commands of its own, such as cargo aliases in `.cargo/config.toml`, `just` or `make` targets, `cargo xtask`, or `package.json` scripts in a mixed repository, run those: they know its flags, features and workspace layout. Otherwise run these from the workspace root, with the flags its CI passes where they differ:

```sh
cargo fmt
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

`cargo fmt` formats every workspace member; don't add `--all`, which also rewrites path dependencies outside the repository. Clippy runs the compiler, so it's the type-check too. `--all-targets` adds tests, benches and examples, which plain `cargo clippy` leaves out, and `-D warnings` fails on every warning, the compiler's included, as CI usually does.

- Run `cargo fmt` first. Where the project has a `rustfmt.toml` or `.rustfmt.toml`, run `cargo fmt --check` before it: on stable, rustfmt warns about options that need nightly and then formats with its defaults anyway. On that warning, format with `cargo +nightly fmt` where a nightly toolchain is installed, and otherwise leave the formatting alone and say so. If formatting changes files outside your change, mention them.
- Then run Clippy. It must pass for the code you changed. Failures elsewhere that were already there aren't yours to fix: report them. Under `-D warnings`, such a failure also keeps the crates that depend on the failing one from being linted at all, so run Clippy again without `-D warnings` then, and make sure no warning points into your files.
- Then run the tests. Where the project uses nextest, run `cargo nextest run --workspace`, plus `cargo test --workspace --doc` where the workspace has a library, since nextest doesn't run doc tests. If `cargo nextest` isn't installed, run `cargo test --workspace` instead and say so.
- Clippy and the tests only see the code that a crate root reaches through `mod` declarations and that the enabled features and the target platform compile, and `cargo fmt` only the files those declarations reach. A new file that no `mod` declares is skipped by all of them without a word, and Clippy and the tests also skip code behind a `#[cfg]` that's off. Check feature-gated code again with `--features <name>`, or with `--all-features` where the features can be combined, and name the code no check reached.
- Lint levels live in the `[lints]` table of `Cargo.toml` (`[workspace.lints]` in a workspace, inherited with `lints.workspace = true`), in crate attributes such as `#![warn(clippy::pedantic)]`, or in `rustflags` in `.cargo/config.toml`, and `clippy.toml` configures the lints themselves. Don't loosen any of them to make a check pass.
- Silence a lint with `#[expect(<lint>, reason = "…")]` on the smallest item that needs it, and never to hide a real bug. Unlike `#[allow]`, `#[expect]` warns once the lint stops firing, so stale exceptions surface. Where the lint fires only in some targets, features or platforms, an `#[expect]` fails in the others: use `#[allow(<lint>, reason = "…")]` there. `reason` needs Rust 1.81; under an older `rust-version`, use `#[allow]` with the reason in a comment.
- If `cargo fmt` or `cargo clippy` isn't installed, say so and suggest `rustup component add rustfmt clippy` instead of skipping the check silently.
- Say which checks actually ran.
