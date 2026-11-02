---
name: develop-bun
description: TypeScript and Bun development specifics for all TypeScript and JavaScript, since Bun is the toolchain everywhere. Names the project's TypeScript, Bun and lint-and-format rules as the standards, and adds the two things the procedure needs on top of them: how to treat a Bun built-in that would replace an existing dependency, and which best-practices skill covers the code. Use together with develop-generic and best-practices-bun when implementing TypeScript; preloaded by developer-bun, developer-react, developer-next and developer-astro.
---

# Development: TypeScript and Bun

Extends `develop-generic`: same scope, procedure and report.

**Before you change any code**, check that `develop-generic` and `best-practices-bun` are in your context in full, not just names in a skill list: a subagent normally has them preloaded, but a plain session or one started with `claude --agent` has only their names. For each one that's missing, read `.claude/skills/<name>/SKILL.md`; one already in your context needs no second read. If the file isn't there either, stop and name the missing skill. Don't start the work without them. Running this skill on its own is the cheaper route for something small — the agent is worth it once the work spans several files.

The standards are the project rules `typescript.md`, `bun.md` and `lint-and-format.md` in `.claude/rules/js/`. They load for the files you'll touch, so follow them there rather than looking for a second copy here, and validate the way `lint-and-format.md` describes.

## What this stack adds

- Reach for a Bun built-in wherever `bun.md` lists one, in the files it says Bun executes. Replacing a dependency the project already relies on isn't part of the task: name the Bun alternative under Decisions instead of making the swap.
- `best-practices-bun` is the performance guide for this code, including the React and Ink parts, since it holds the framework-neutral rules.
