---
name: develop-react
description: React development specifics for React web code, the React islands and components inside Next.js and Astro included. Names the project's React and MUI rules as the standards and adds what the procedure needs on top of them: which best-practices skill covers the code, and the restraint the React Compiler and the guide itself call for. Use together with develop-generic, develop-bun and best-practices-react when implementing React; preloaded by developer-react, developer-next and developer-astro.
---

# Development: React

Extends `develop-generic` and builds on `develop-bun`, whose TypeScript points apply to React code too: same scope, procedure and report.

The standards are `.claude/rules/js/react.md`, which loads for `.tsx` and `.jsx` files, and `js/mui.md` where the project uses MUI. Follow them there rather than looking for a second copy here.

## What this stack adds

- `best-practices-react` is the performance guide for this code, on top of `best-practices-bun`.
- Apply it the way `react.md` says to: fix what the code shows rather than optimizing on speculation, write no `useMemo`, `useCallback` or `memo` where the React Compiler is on, and check that an import path exists before switching to it, since the guide's examples can lag the installed versions.
