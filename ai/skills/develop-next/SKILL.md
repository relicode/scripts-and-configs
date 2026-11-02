---
name: develop-next
description: Next.js development specifics for the App Router, server and client components, route handlers and server actions. Names the project's Next.js rule as the standards and adds the two things the procedure needs on top of it: reading the version-matched docs Next.js ships in node_modules before writing, and reporting what the extra validation steps couldn't cover. Use together with develop-generic, develop-bun and develop-react when implementing Next.js; preloaded by developer-next.
---

# Development: Next.js

Extends `develop-generic` and builds on `develop-bun` and `develop-react`, whose TypeScript and React points apply to Next.js code too: same scope, procedure and report.

**Before you change any code**, check that `develop-generic`, `develop-bun`, `develop-react`, `best-practices-bun` and `best-practices-react` are in your context in full, not just names in a skill list: a subagent normally has them preloaded, but a plain session or one started with `claude --agent` has only their names. For each one that's missing, read `.claude/skills/<name>/SKILL.md`; one already in your context needs no second read. If the file isn't there either, stop and name the missing skill. Don't start the work without them. Running this skill on its own is the cheaper route for something small — the agent is worth it once the work spans several files.

The standards, the docs to read first and the extra validation steps are all in `.claude/rules/js/next.md`, which loads for every TypeScript and JavaScript file and applies only to the app's code. Follow them there rather than looking for a second copy here.

## What this stack adds

- Read the shipped guide for the APIs you're about to use *before* writing, as `next.md` requires: it's version-matched to the installed Next.js, and memory isn't.
- Validate the way `next.md` describes, on top of the project's own checks. List whatever it leaves unchecked — a dev server that wasn't running, a build you couldn't run for want of environment variables — under Not Run.
