---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
---

# Next.js

Applies to code in a Next.js app. In a repository where only part of the tree is that app, these rules stop at that part: a script or a package outside it follows `.claude/rules/js/bun.md` instead, including its preference for Bun's built-ins, which the "Runtime" rule below rules out only for the app itself.

The React rules in `.claude/rules/js/react.md` apply to its components as well.

## Docs

Next.js 16.2 and later ship version-matched docs at `node_modules/next/dist/docs/`, in the app's folder or a parent folder. Read the relevant guide there before writing or reviewing Next.js API usage, in preference to memory and to docs servers such as context7.

## Runtime

Next.js runs on Node, so app code uses no Bun runtime APIs (`.claude/rules/js/bun.md`). Bun stays the toolchain for installing, scripts and tests.

## Server entry points

- A server action or route handler is callable directly by anyone, so it authenticates its caller, authorizes the action and validates its input itself, rather than relying on the page, layout or middleware that normally reaches it.
- `redirect()` and a `Location` header take a target from an allowlist, not from user input such as a `next` parameter.

## Secrets

A server-only value never reaches the browser. The build inlines every `NEXT_PUBLIC_` variable into the bundle, and a prop handed to a client component is serialized into the HTML it ships, so a token or key belongs behind a server-side call and not in either. `.claude/rules/js/react.md` states the same rule for the other frameworks' prefixes.

## The client boundary

Keep `'use client'` as far down the tree as the feature allows: a boundary higher up pulls its subtree, and the modules it imports, into the browser bundle.

## Validating a change

The project's `lint` and `format` scripts come first, the way `.claude/rules/js/lint-and-format.md` describes. On top of those:

- Check the change against a Next.js dev server that's **already running** from the app's folder in the working tree, through `next-devtools`: `get_project_metadata` gives a server's path, `get_compilation_issues` its compile errors and `get_logs` its dev log. Where `.claude/rules/clean-code.md` says it's safe to run the affected pages, request them from that server and look for new runtime errors in its dev log; they can take a few seconds to appear.
- Don't start a dev server: from Next.js 16.3 one started by an agent writes to `AGENTS.md` or `CLAUDE.md`.
- Run the project's `build` script only when the change touches routes, segment config, data fetching, or the `'use client'` / `'use server'` boundaries. Where it needs environment variables you don't have, say so instead.
- Say what you couldn't check.
