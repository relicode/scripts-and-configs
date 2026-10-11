---
name: review-generic
description: Code-review procedure for a quality pass on recently written or changed code in any language. Checks correctness, clutter, inconsistencies, repetition, bad practices and security against the project's rules, fixes what the change got wrong, runs the project's checks until clean, and reports. Preloaded by the reviewer agents; load it directly when asked to review and clean up code that was just written. For a report-only review of a PR or diff, the built-in code-review fits better.
---

# Code review

A review is a quality pass on code that was just written or changed: find the problems in the change, fix them, prove the result is clean, and report. Language skills (`review-<language>`, such as `review-bun`) add their own checks; where they are more specific than this file, they win.

## Scope

- Review the change: the files you were pointed at or, if none, the uncommitted changes (`git status --porcelain -uall`) plus, on a branch, the commits it adds over its base: `git diff --name-only $(git merge-base HEAD <base>)`, where `<base>` is the first of `origin/HEAD`, `main` and `master` that exists. Say which base you used, or that there was none. Leave out generated files, lockfiles, vendored code and the `.claude/` folder.
- Findings are about code the change added or modified. Problems that were already there go under Decisions to confirm instead of being fixed, and nothing exported gets renamed or changes its signature.
- Decisions stated in your instructions, such as "keep `null` here", are constraints: they outrank the house rules.
- Skip files whose real path is outside the repository (compare `realpath` with `git rev-parse --show-toplevel`): symlinked code belongs to another project.
- Before Phase 1, read `CLAUDE.md` and every rule in the repository root's `.claude/rules/`, subfolders included, that applies to the files in scope (no `paths:`, or `paths:` that match them), from disk even when a copy is already in your context, since that copy can be out of date. Violations in the change are findings.
- Code that follows its file's established style is no violation, even where the house rules say otherwise: see "Existing style wins" in `.claude/rules/clean-code.md`.

## Phase 1: Review

Check the change for:

1. **Correctness**: wrong results or behavior; wrong API usage or arguments; type errors; unhandled edge cases; code that contradicts its evident intent.
2. **Clutter**: unused imports, variables and parameters; dead or unreachable code; comments that restate the code; needlessly verbose constructs; empty blocks and statements that do nothing.
3. **Inconsistencies**: naming that breaks the language's or project's conventions; two patterns for the same job; error handling that differs within one module; anything that breaks the project's rules.
4. **Repetition**: logic that belongs in a shared helper; copy-paste with small variations; repeated type definitions; near-identical functions one parameter could unify.
5. **Bad practices**: loose types where real ones are feasible; swallowed errors or missing error handling; unawaited async work and race conditions; resource leaks (files, streams, subscriptions, child processes); magic numbers and strings; mutable or global state where immutability is expected.
6. **Security**: injection (shell, SQL, path traversal through user-supplied paths); secrets in source, config or logs; missing validation at trust boundaries; `eval` and dynamically built code; error messages that leak paths, stack traces or environment.

When the project has docs MCP servers, such as context7, astro-docs or mui-mcp, check library and framework API usage against them rather than from memory.

Record each finding as:

- **Severity**: 🔴 Critical | 🟠 Major | 🟡 Minor
- **Category**: one of the six above
- **Location**: file and line
- **Issue**: what's wrong
- **Fix**: what to change

Grade severity by impact:

- 🔴 **Critical**: exploitable security holes, data loss or corruption, crashes on normal paths, code that doesn't run.
- 🟠 **Major**: bugs in realistic cases, failing lint or type checks, resource leaks, missing error handling on real failure paths.
- 🟡 **Minor**: clutter, naming, style and inconsistencies that don't change behavior.

## Phase 2: Fix and validate

Start only once the review is complete.

1. Fix every finding: 🔴 first, then 🟠, then 🟡.
2. Validate through the project's own checks: format, lint (type-checks included) and tests. The project's lint-and-format rule for the language says how, where there is one; other ecosystems have equivalent task targets (Gradle, Make, just).
3. The checks must pass for the files in scope. Failures elsewhere that were already there go under Decisions to confirm.
4. If the project defines no checks, run only tools it already configures, on the files in scope, and install nothing. If there are none, say that nothing could be validated.
5. Never make a check pass by editing or skipping tests, updating snapshots, loosening configs or adding suppressions; a test you believe is wrong goes under Decisions to confirm. Don't change the toolchain either: no new or edited configs, dependencies or lockfiles. Setup gaps, such as missing scripts or type packages, go under Decisions to confirm.
6. If a fix introduces new problems, iterate until clean.

## Phase 3: Docs

- Update `CLAUDE.md` if the change alters the project's shape, tooling or entry points, and `README.md` if user-facing instructions changed.
- If a hand-maintained `CHANGELOG.md` exists, make sure it has an entry for the change, in its existing format. Leave generated changelogs (for example from changesets) alone, and don't create one unless asked.

## Report

Use this format, emoji markers included:

```
## Code Review Summary

### Findings (X total: Y critical, Z major, W minor)
[each finding, in the format above]

### Fixes Applied
[each fix]

### Decisions to confirm
[choices the code didn't settle, problems that were already there, setup gaps; or "none"]

### Validation Results
- [check]: ✅/❌ or N/A, naming the script or tool that ran (one line per check)
```

If something can't be resolved, say why and what to do next.

## Ground rules

- Fix the change's problems directly; don't stop at reporting them.
- You can't ask questions mid-review. When a fix needs a decision the code doesn't settle, take the least invasive option (or leave the code as is) and list it under Decisions to confirm.
- Don't finish until the checks pass for the files in scope, or you've explained what blocks it.
- Run the project's checks and scripts only when `.claude/rules/clean-code.md` says that's safe.
- Never commit without explicit permission.
- Never add Claude attribution.
