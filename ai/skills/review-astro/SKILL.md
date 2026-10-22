---
name: review-astro
description: Astro review specifics. Grades violations of the project's Astro rule into the review categories: actions and endpoints that trust their caller and secrets behind the PUBLIC_ prefix as Security findings, undeclared environment variables, Bun runtime APIs in app code, client:* directives that ship needless JavaScript and schemaless content collections as Bad practices. Use together with review-generic, review-bun and review-react when reviewing Astro code; preloaded by reviewer-astro.
---

# Code review: Astro

Extends `review-generic` and builds on `review-bun`, whose TypeScript checks cover `.astro` frontmatter, and `review-react`, whose checks cover the islands: same scope, phases and report, plus the grading below.

Run on its own rather than through an agent, read the skills named above from `.claude/skills/<name>/SKILL.md` before starting: an agent preloads them, a plain session doesn't. For something small that's the cheaper route — the agent is worth it once the work spans several files.

The standards are `.claude/rules/js/astro.md`, which loads for `.astro` files and every TypeScript and JavaScript file, and applies only to the site's code. Validate the way `.claude/rules/js/lint-and-format.md` describes; it covers `.astro` files.

## How to grade

Violations of `astro.md` land in review-generic's categories like this:

- Its "Server entry points" and "Untrusted HTML" rules are **Security** findings, the Astro form of what review-generic already lists: an action or endpoint that leaves authentication, authorization or input validation to the page or middleware above it; `Astro.redirect()` or a `Location` header taking a target from user input; `set:html` fed unsanitized HTML. Grade a missing authorization check 🔴 where it exposes another user's data or a privileged action.
- A server-only value behind the `PUBLIC_` prefix, or passed to an island as a prop, is a **Security** finding: the build inlines the first into the bundle and serializes the second into the HTML.
- Its "Environment variables", "Islands" and "Content collections" rules are **Bad practices** findings: an undeclared variable, which Astro types `any`; a `client:*` directive on a component with no interactivity, or `client:load` where `client:visible` would do; a collection without a schema, or entries read off the filesystem.
- Its "Runtime" rule is a **Bad practices** finding: a Bun runtime API in app code, which runs on Node or the adapter's runtime. Scripts and packages outside the site, which `bun.md` governs, are fine.

## Validating

Validate the way `astro.md`'s "Validating a change" describes, which includes when the build is worth running, and report whatever it leaves unchecked.
