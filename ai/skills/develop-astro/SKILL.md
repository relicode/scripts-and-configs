---
name: develop-astro
description: Astro development specifics for components, content collections, islands and SSR adapters. Names the project's Astro rule as the standards and adds what the procedure needs on top of it: which rules reach .astro frontmatter and React islands, and which best-practices skills cover them. Use together with develop-generic, develop-bun and develop-react when implementing Astro; preloaded by developer-astro.
---

# Development: Astro

Extends `develop-generic` and builds on `develop-bun` and `develop-react`: same scope, procedure and report.

Run on its own rather than through an agent, read the skills named above from `.claude/skills/<name>/SKILL.md` before starting: an agent preloads them, a plain session doesn't. For something small that's the cheaper route — the agent is worth it once the work spans several files.

The standards are `.claude/rules/js/astro.md`, which loads for `.astro` files and every TypeScript and JavaScript file, and applies only to the site's code. Follow them there rather than looking for a second copy here.

## What this stack adds

- The frontmatter above the `---` fence is TypeScript and gets the same treatment as any other TypeScript in the project, so `js/typescript.md` and the `develop-bun` points apply to it. The React rules and `develop-react` apply to the islands.
- `best-practices-bun` is the performance guide for the frontmatter and `best-practices-react` for the islands. Shipping less island JavaScript, through the `client:*` directives `astro.md` describes, beats optimizing what ships.
- Validate the way `astro.md`'s "Validating a change" describes, which covers the project's lint and format scripts and when the build is worth running on top of them. List what it leaves unchecked under Not Run.
