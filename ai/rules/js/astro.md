---
paths:
  - "**/*.astro"
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
---

# Astro

Applies to code in an Astro project — the `.astro` files and the `.ts` and `.tsx` modules beside them, since actions, endpoints, the content config and the islands are not `.astro` files. In a repository where only part of the tree is an Astro site, these rules stop at that part; scripts and packages outside it follow `.claude/rules/js/bun.md` instead.

The TypeScript rules in `.claude/rules/js/typescript.md` apply to `.astro` frontmatter, and the React rules in `.claude/rules/js/react.md` to React islands.

## Runtime

Astro runs on Node or the runtime its adapter targets, so app code uses no Bun runtime APIs (`.claude/rules/js/bun.md`). Bun stays the toolchain for installing, scripts and tests.

## Islands

A component ships JavaScript only when it needs to. Pick the `client:*` directive that matches what the island does — `client:load` only for something interactive on arrival, `client:visible` for anything below the fold — and leave a component static when it has no interactivity.

## Content collections

Give every collection a schema, and read entries through the content APIs rather than off the filesystem, so the schema types the result.

## Environment variables

Declare every variable the code reads, in the `astro:env` schema or in `ImportMetaEnv` in `src/env.d.ts`: Astro types an undeclared one `any`. Server-only values go in the server half of the schema, never behind the `PUBLIC_` prefix, which the build inlines into the bundle.

## Server entry points

An Astro action or endpoint is callable directly by anyone, so it authenticates its caller, authorizes the action and validates its input itself, rather than relying on the page or middleware that normally reaches it. `Astro.redirect()` and a `Location` header take a target from an allowlist, not from user input.

## Untrusted HTML

`set:html` takes only trusted or sanitized HTML, in templates and islands alike; `.claude/rules/js/react.md` covers `dangerouslySetInnerHTML` the same way.

## Validating a change

The project's `lint` and `format` scripts come first, the way `.claude/rules/js/lint-and-format.md` describes; it covers `.astro` files. Run the project's `build` script as well when the change touches content collections, the Astro config, an adapter, or the islands' `client:*` directives: the build is what surfaces a collection schema mismatch and an adapter's own errors. Where it needs environment variables you don't have, say so instead, and say what you couldn't check.

## Docs

Look up Astro APIs in the `astro-docs` MCP server where the project has it, rather than from memory.
