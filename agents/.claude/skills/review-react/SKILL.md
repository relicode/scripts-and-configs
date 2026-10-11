---
name: review-react
description: React and Next.js review specifics. Grades the best-practices-react performance rules on the review scale and says when a production build is worth running. Use together with review-generic, review-bun, best-practices-bun and best-practices-react when reviewing React web code; preloaded by reviewer-react, reviewer-next and reviewer-astro.
---

# Code review: React and Next.js

Extends `review-generic` and builds on `review-bun`, whose TypeScript and performance checks apply to React code too: same scope, phases and report, plus the checks below. The project rule `.claude/rules/js/react.md` says how to apply the guide; validate the way `.claude/rules/js/lint-and-format.md` describes.

## Performance findings

Check the change against the `best-practices-react` rules. The full rules, with incorrect and correct examples, are in `references/react-performance-guidelines.md` in that skill's base directory. Record problems in the **Bad practices** category, graded on review-generic's scale so 🔴 means the same thing in every report: a CRITICAL or HIGH rule broken on a real code path is 🟠, anything lower is 🟡. Fixes that need a new dependency go under Decisions to confirm.

## Build

Run the project's `build` script only when the change touches routes, segment config, data fetching, or the `'use client'` / `'use server'` boundaries. If it needs environment variables you don't have, say so instead.
