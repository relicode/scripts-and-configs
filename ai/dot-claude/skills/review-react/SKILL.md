---
name: review-react
description: React and Next.js review specifics. Checks for XSS through raw HTML, server actions and route handlers that trust their caller, open redirects, secrets that reach the browser and effects without cleanup, grades the best-practices-react performance rules on the review scale and says when a production build is worth running. Use together with review-generic, review-bun, best-practices-bun and best-practices-react when reviewing React web code; preloaded by reviewer-react, reviewer-next and reviewer-astro.
---

# Code review: React and Next.js

Extends `review-generic` and builds on `review-bun`, whose TypeScript and performance checks apply to React code too: same scope, phases and report, plus the checks below. The project rule `.claude/rules/js/react.md` says how to apply the guide; validate the way `.claude/rules/js/lint-and-format.md` describes.

## Security findings

On top of review-generic's checks, these are **Security** findings:

- `dangerouslySetInnerHTML`, or Astro's `set:html`, fed anything but trusted or sanitized HTML: XSS.
- A server action, Astro action, route handler or endpoint that relies on the page, layout or middleware for its checks. Anyone can call it directly, so it authenticates and authorizes the caller and validates its input itself.
- `redirect()` or a `Location` header whose target is user input, such as a `next` parameter, without an allowlist: an open redirect.
- A secret reaching the browser: a server-only value, such as an environment variable without the framework's public prefix (`NEXT_PUBLIC_`, `PUBLIC_`, `VITE_`) or a token, passed to a client component or an island as a prop, or written into markup or an inline script. A secret in a public-prefixed variable is exposed too, since the build inlines it into the bundle.

## Other findings

These are **Bad practices** findings:

- An effect that subscribes, listens, starts a timer or fetches without a cleanup that undoes it: unsubscribing, removing the listener, clearing the timer or aborting the request.
- In Astro, an environment variable the code reads without declaring it, in the `astro:env` schema or in `ImportMetaEnv` in `src/env.d.ts`: Astro types it `any` by default.

## Performance findings

Check the change against the `best-practices-react` rules. The full rules, with incorrect and correct examples, are in `references/react-performance-guidelines.md` in that skill's base directory. Record problems in the **Bad practices** category, graded on review-generic's scale so 🔴 means the same thing in every report: a CRITICAL or HIGH rule broken on a real code path is 🟠, anything lower is 🟡. Fixes that need a new dependency go under Decisions to confirm.

## Build

Run the project's `build` script only when the change touches routes, segment config, data fetching, or the `'use client'` / `'use server'` boundaries. If it needs environment variables you don't have, say so instead.
