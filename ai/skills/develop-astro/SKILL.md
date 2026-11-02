---
name: develop-astro
description: Astro development specifics for components, content collections, islands and SSR adapters. Names the project's Astro rule as the standards and adds what the procedure needs on top of it: which rules reach .astro frontmatter and React islands, and which best-practices skills cover them. Use together with develop-generic, develop-bun and develop-react when implementing Astro; preloaded by developer-astro.
---

# Development: Astro

Extends `develop-generic` and builds on `develop-bun` and `develop-react`: same scope, procedure and report.

**Before you change any code**, check that `develop-generic`, `develop-bun`, `develop-react`, `best-practices-bun` and `best-practices-react` are in your context in full, not just names in a skill list: a subagent normally has them preloaded, but a plain session or one started with `claude --agent` has only their names. For each one that's missing, read `.claude/skills/<name>/SKILL.md`; one already in your context needs no second read. If the file isn't there either, stop and name the missing skill. Don't start the work without them. Running this skill on its own is the cheaper route for something small — the agent is worth it once the work spans several files.

The standards are `.claude/rules/js/astro.md`, which loads for `.astro` files and every TypeScript and JavaScript file, and applies only to the site's code. Follow them there rather than looking for a second copy here.

## What this stack adds

- The frontmatter above the `---` fence is TypeScript and gets the same treatment as any other TypeScript in the project, so `js/typescript.md` and the `develop-bun` points apply to it. The React rules and `develop-react` apply to the islands.
- `best-practices-bun` is the performance guide for the frontmatter and `best-practices-react` for the islands. Shipping less island JavaScript, through the `client:*` directives `astro.md` describes, beats optimizing what ships.
- Validate the way `astro.md`'s "Validating a change" describes, which covers the project's lint and format scripts and when the build is worth running on top of them. List what it leaves unchecked under Not Run.
