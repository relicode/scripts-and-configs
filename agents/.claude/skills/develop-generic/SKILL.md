---
name: develop-generic
description: Development procedure for implementing a self-contained change in any language. Settles the scope or returns open questions, reads the project's rules and the code the change touches, implements it in the established style with tests, runs the project's checks until clean, and reports what changed and which reviewer to run next. Preloaded by the dev agents; load it directly only when asked to develop a change this way.
---

# Development

Implementing a change means building what was asked in the project's own style, proving it with the project's checks, and handing it to a reviewer. The standards are the rules in `.claude/rules/`: this procedure points to them instead of restating them. Best-practices skills (`best-practices-<language>`, such as `best-practices-bun`) add the language's own.

## Scope

- Build what you were asked for and nothing more. New dependencies and changes to configs or the toolchain belong to the task only when it asks for them; a library a best-practices skill recommends goes under Decisions instead of being added.
- Decisions stated in your instructions, such as a deliberate deviation from the house rules, are constraints: they outrank the house rules.
- You can't ask questions mid-run. When the requirements are unclear, contradict each other or need something the task doesn't ask for, stop before writing any code and return the open questions instead of guessing.
- When a question only comes up partway through, take the least invasive option and list it under Decisions. If it would change what gets built, stop there and report it along with what you've changed so far.

## Before editing

- Read `CLAUDE.md` and every rule in the repository root's `.claude/rules/`, subfolders included, that applies to the files you'll change or create (no `paths:`, or `paths:` that match them), unless it's already in your context.
- Go through "Before editing a file" in `.claude/rules/clean-code.md` for each file you'll change.

## Implementing

- Follow the established style the way "Existing style wins" in `.claude/rules/clean-code.md` describes.
- Add or update tests for the change where the project has tests, with its runner and layout. If it has none, say so instead of setting them up.
- Apply the preloaded best-practices skills to the code they cover.

## Validating

- Run the project's format, lint (type-checks included) and tests, and fix what they report until they pass for the files you changed. The project's lint-and-format rule for the language says how, where there is one; other ecosystems have equivalent task targets (Gradle, Make, just).
- Never make a check pass by weakening it: no skipped tests, assertions bent to fit the code, loosened configs, or suppressions that hide a real problem. Change a test only where the task changes the behavior it checks; one you believe is wrong goes under Decisions.
- Failures in files you didn't change aren't yours to fix unless your change caused them: report them.
- Finish with "Before saying you're done" in `.claude/rules/clean-code.md`.

## Safety

Run nothing that deletes, deploys, migrates or contacts real services, whether it's the code you wrote, a package script or a one-off command. Use a dry run where there is one, and report what you didn't run.

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

### Next
Run [reviewer] on this change.
```

The reviewer is the one your instructions name, or else the most specific reviewer agent in `.claude/agents/` for the files you changed. If you stopped for open questions before writing code, report only those, each with the options you see, and say that nothing was changed. If you stopped partway, use the full format with the question at the top.

## Ground rules

- Never commit or push.
- Never add Claude attribution.
