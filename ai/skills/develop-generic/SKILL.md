---
name: develop-generic
description: Development procedure for implementing a self-contained change in any language. Settles the scope or returns open questions, reads the project's rules and the code the change touches, implements it in the established style with tests, runs the project's checks until clean, and reports what changed and which reviewer to run next. Preloaded by the developer agents; load it directly only when asked to develop a change this way.
---

# Development

Implementing a change means building what was asked in the project's own style, proving it with the project's checks, and handing it to a reviewer. The standards are the rules in `.claude/rules/`: this procedure points to them instead of restating them. Stack skills (`develop-<stack>`, such as `develop-bun`) add their own points, and best-practices skills (`best-practices-<language>`, such as `best-practices-bun`) the performance rules; where either is more specific than this file, it wins.

## Scope

- Build what you were asked for and nothing more. New dependencies, and changes to the build, lint, test, CI or deployment setup or to environment files such as `.env`, belong to the task only when it asks for them; a library a best-practices skill recommends goes under Decisions instead of being added.
- Decisions stated in your instructions, such as a deliberate deviation from the house rules, are constraints: they outrank the house rules.
- You can't ask questions mid-run. When the requirements are unclear or contradict each other, or need one of those changes without the task asking for it, stop before writing any code and return the open questions instead of guessing. New files the task implies, such as a module, its tests or a schema, are part of it.
- When a question only comes up partway through, take the least invasive option and list it under Decisions. If it would change what gets built, stop there and report it along with what you've changed so far.

## Before editing

- Read the `CLAUDE.md` files from the repository root down to the folders you'll work in, with the files they import through `@path` lines, and every rule in the repository root's `.claude/rules/`, subfolders included, that applies to the files you'll change or create (no `paths:`, or `paths:` that match them). Read them from disk even when a copy is already in your context, since that copy can be out of date.
- Go through "Before editing a file" in `.claude/rules/clean-code.md` for each file you'll change.

## Implementing

- Follow the established style the way "Existing style wins" in `.claude/rules/clean-code.md` describes.
- When the project has docs MCP servers, such as context7, astro-docs or mui-mcp, look up library and framework APIs there rather than from memory.
- Add or update tests for the change where the project has tests, with its runner and layout. If it has none, say so instead of setting them up. A test you add for a bug fix has to fail without the fix: undo the fix, run the test and see it fail, then restore the fix.
- Hold new code to these, whatever the stack: a server entry point anyone can call directly — an action, route handler or endpoint — authenticates its caller, authorizes the action and validates its input itself, rather than relying on the page, layout or middleware that normally reaches it; a redirect target or `Location` header comes from an allowlist, not from user input; untrusted data reaching HTML, a shell, a query or a path is escaped or validated at that boundary; and no secret reaches the browser, which a build arranges for any value behind a public environment prefix and for anything handed to code that runs there.
- Apply the preloaded best-practices skills to the code they cover. When the reviewer you'll name preloads a best-practices skill you don't have (its `skills:` in `.claude/agents/`), read that skill's `SKILL.md` and apply it too: the reviewer checks your change against it.

## Validating

- Run the project's format, lint (type-checks included) and tests, and fix what they report until they pass for the files you changed. The project's lint-and-format rule for the language says how, where there is one; other ecosystems have equivalent task targets (Gradle, Make, just).
- Never make a check pass by weakening it: no skipped tests, assertions or snapshots bent to fit the code, loosened configs, or suppressions that hide a real problem. Change a test or snapshot only where the task changes the behavior it checks; one you believe is wrong goes under Decisions.
- Failures in files you didn't change aren't yours to fix unless your change caused them: report them.
- Finish with "Before saying you're done" in `.claude/rules/clean-code.md`.

## Report

Use this format, emoji markers included:

```
## Development Summary

### Files Changed
[each file, and what changed in it]

### Decisions
[choices the task didn't settle and how you settled them, deviations you were told to make, problems that were already there; or "none"]

### Validation Results
- [check]: ✅/❌, naming the script or tool that ran (one line per check)

### Not Run
[checks, tests or code you didn't run, and why; or "none"]

### Review
[`Not run.` and the reviewer that covers this change, one per language where it touches several — or, where your task told you to run the review, which reviewer ran, what it found and what you fixed]
```

Name the reviewer the task names, or else the one your agent instructions name if `.claude/agents/` has it, or else the most specific reviewer agent there for the files you changed. Where the change touches more than one language, name one per language, since a reviewer only covers its own. Naming them is all you do unless your instructions for this task say otherwise: a review is the user's call, made at the points `.claude/rules/subagents.md` describes. Don't start one on your own initiative, and don't ask the session to — but when the task tells you to review as part of the same pass, do, and report that round under Review in place of `Not run.`

If you stopped for open questions before writing code, report only those, each with the options you see, and say that nothing was changed. If you stopped partway, use the full format with the question at the top, and under Review say the change isn't ready for one and what answer you need to continue.

## Ground rules

- Run the project's checks and scripts only when `.claude/rules/clean-code.md` says that's safe.
- Committing and attribution follow `.claude/rules/git.md`: leave the commit to the user, and never sign the work as Claude.
