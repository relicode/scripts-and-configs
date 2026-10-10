---
name: review-bun
description: Bun and TypeScript review specifics for code that Bun runs (scripts, CLIs, servers, tests). Checks the change against the project's Bun and TypeScript rules, and for shell and argument injection through Bun.spawn and Bun shell, child-process leaks and Ink pitfalls. Use together with review-generic when reviewing Bun code; preloaded by reviewer-b.
---

# Code review: Bun and TypeScript

Extends `review-generic`: same scope, phases and report, plus the checks below. The standards are the project rules `bun.md`, `typescript.md` and `lint-and-format.md` in `.claude/rules/js/`; validate the way `lint-and-format.md` describes.

## Extra checks

- **Bun usage.** New code that reaches for a Node API or npm package where `bun.md` lists a Bun built-in, in files Bun executes (`bun.md` says which those are). Follow `bun.md` on `@types/bun`, and put swaps of dependencies the project already relies on under Decisions to confirm.
- **Shell and argument injection.** `Bun.spawn({ cmd: [...] })` runs no shell, and `` $`…` `` escapes the strings it interpolates. That stops shell metacharacters and nothing else. Flag:
  - `` ${{ raw: value }} ``, which skips escaping, used with anything untrusted;
  - interpolated values not known to be strings: `$` escapes strings only, so an object from parsed JSON or a request body can carry its own `raw` key and inject a command;
  - untrusted values that can start with `-`, which become options such as `--output=…` in both `$` and `Bun.spawn`: validate them or pass them after `--`;
  - untrusted `cmd[0]`, `cwd` or `env`, and command strings built by hand for `sh -c` or `bash -c`.
- **Child processes.** Await `exited`, drain or pipe stdout and stderr, and check the exit code.
- **Ink.** `useEffect` without cleanup or with wrong dependencies; timers, subscriptions and stdin listeners left running after the app exits.
