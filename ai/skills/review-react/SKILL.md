---
name: review-react
description: React review specifics for React web code, the React islands and components inside Next.js and Astro included. Grades violations of the project's React rule into the review categories: raw HTML and secrets reaching the browser as Security findings, missing effect cleanup and effects that should be computations as Bad practices. Use together with review-generic, review-bun and best-practices-react when reviewing React code; preloaded by reviewer-react, reviewer-next and reviewer-astro.
---

# Code review: React

Extends `review-generic` and builds on `review-bun`, whose TypeScript checks apply to React code too: same scope, phases and report, plus the grading below.

The standards are `.claude/rules/js/react.md`, which loads for `.tsx` and `.jsx` files, and `js/mui.md` where the project uses MUI. Validate the way `.claude/rules/js/lint-and-format.md` describes.

## How to grade

Violations of `react.md` land in review-generic's categories like this:

- Its "Untrusted HTML and secrets" rules are **Security** findings: unsanitized HTML through `dangerouslySetInnerHTML` is XSS, and a server-only value that reaches the browser — in a public-prefixed variable, in markup, or as a prop to a component that renders there — is an exposed secret, graded by what the secret opens.
- Its "Effects" rules are **Bad practices** findings.
- `best-practices-react` is the performance guide for this code, on top of `best-practices-bun`; grade what it turns up as review-generic's "Performance rules from a best-practices skill" says. `react.md` also sets the limits on applying it: don't report missing `useMemo`, `useCallback` or `memo` where the React Compiler is on, and don't ask for memoization the code doesn't show a need for.
