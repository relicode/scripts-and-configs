---
name: develop-react
description: React development specifics for React web code, the React islands and components inside Next.js and Astro included. Names the project's React and MUI rules as the standards and adds what the procedure needs on top of them: which best-practices skill covers the code, and the restraint the React Compiler and the guide itself call for. Use together with develop-generic, develop-bun and best-practices-react when implementing React; preloaded by developer-react, developer-next and developer-astro.
---

# Development: React

Extends `develop-generic` and builds on `develop-bun`, whose TypeScript points apply to React code too: same scope, procedure and report.

**Before you change any code**, check that `develop-generic`, `develop-bun`, `best-practices-bun` and `best-practices-react` are in your context in full, not just names in a skill list: a subagent normally has them preloaded, but a plain session or one started with `claude --agent` has only their names. For each one that's missing, read `.claude/skills/<name>/SKILL.md`; one already in your context needs no second read. If the file isn't there either, stop and name the missing skill. Don't start the work without them. Running this skill on its own is the cheaper route for something small — the agent is worth it once the work spans several files.

The standards are `.claude/rules/js/react.md`, which loads for `.tsx` and `.jsx` files, and `js/mui.md` where the project uses MUI. Follow them there rather than looking for a second copy here.

## What this stack adds

- `best-practices-react` is the performance guide for this code, on top of `best-practices-bun`.
- Apply it the way `react.md` says to: fix what the code shows rather than optimizing on speculation, write no `useMemo`, `useCallback` or `memo` where the React Compiler is on, and check that an import path exists before switching to it, since the guide's examples can lag the installed versions.
