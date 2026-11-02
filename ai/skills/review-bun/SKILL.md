---
name: review-bun
description: TypeScript and Bun review specifics for all TypeScript and JavaScript, since Bun is the toolchain everywhere. Grades violations of the project's TypeScript and Bun rules into the review categories: shell and argument injection through Bun.spawn and Bun shell as Security findings, child-process leaks and Node APIs where a Bun built-in exists as Bad practices. Use together with review-generic and best-practices-bun when reviewing TypeScript; preloaded by reviewer-bun, reviewer-react, reviewer-next and reviewer-astro.
---

# Code review: TypeScript and Bun

Extends `review-generic`: same scope, phases and report, plus the grading below.

**Before you read any code**, check that `review-generic` and `best-practices-bun` are in your context in full, not just names in a skill list: a subagent normally has them preloaded, but a plain session or one started with `claude --agent` has only their names. For each one that's missing, read `.claude/skills/<name>/SKILL.md`; one already in your context needs no second read. If the file isn't there either, stop and name the missing skill. Don't start the review without them. Running this skill on its own is the cheaper route for something small — the agent is worth it once the work spans several files.

The standards are the project rules `typescript.md`, `bun.md` and `lint-and-format.md` in `.claude/rules/js/`. They load for the files in scope, so check against them there and validate the way `lint-and-format.md` describes.

## How to grade

Violations of `bun.md` land in review-generic's categories like this:

- Its "Processes" rules: shell and argument injection is a **Security** finding, and a child process that isn't awaited, drained or checked is a **Bad practices** one.
- Its "APIs" rules are **Bad practices** findings: new code reaching for a Node API or npm package where `bun.md` lists a Bun built-in, in the files it says Bun executes, or `Bun.*` used without the `@types/bun` setup it requires. A swap of a dependency the project already relies on goes under Decisions to confirm rather than being made.
- `best-practices-bun` is the performance guide for this code, Ink and React included; grade what it turns up as review-generic's "Performance rules from a best-practices skill" says.

Ink CLIs are in this skill's scope even when nothing else about the project is React, and Ink components are React: an effect that subscribes, listens or starts a timer without the cleanup that undoes it, a dependency array that doesn't match what the body reads, or a stdin listener or timer still running at exit is a **Bad practices** finding. `.claude/rules/js/react.md` states these as the standard, and it loads for the `.tsx` files Ink components live in.
