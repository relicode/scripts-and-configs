---
name: review-next
description: Next.js review specifics. Grades violations of the project's Next.js rule into the review categories: server actions and route handlers that trust their caller and open redirects as Security findings, Bun runtime APIs in app code and a client boundary pushed too high as Bad practices. Use together with review-generic, review-bun and review-react when reviewing Next.js code; preloaded by reviewer-next.
---

# Code review: Next.js

Extends `review-generic` and builds on `review-bun` and `review-react`, whose TypeScript and React checks apply to Next.js code too: same scope, phases and report, plus the grading below.

Run on its own rather than through an agent, read the skills named above from `.claude/skills/<name>/SKILL.md` before starting: an agent preloads them, a plain session doesn't. For something small that's the cheaper route — the agent is worth it once the work spans several files.

The standards, the docs to check API usage against and the extra validation steps are all in `.claude/rules/js/next.md`, which loads for the app's files.

## How to grade

Violations of `next.md` land in review-generic's categories like this:

- Its "Server entry points" and "Secrets" rules are **Security** findings, the Next.js form of what review-generic already lists: a server action or route handler that leaves authentication, authorization or input validation to the page, layout or middleware above it; a redirect target taken from user input without an allowlist; a server-only value in a `NEXT_PUBLIC_` variable or handed to a client component as a prop. Grade a missing authorization check 🔴 where it exposes another user's data or a privileged action.
- Its "Runtime" rule is a **Bad practices** finding: a Bun runtime API in app code, which runs on Node. Scripts and packages outside the app, which `bun.md` governs, are fine.
- Its "The client boundary" rule is a **Bad practices** finding, graded by what the boundary drags into the bundle — 🟠 where it pulls server-only modules across, 🟡 where it only costs bundle size.
- API usage that contradicts the shipped guide `next.md` points at is a **Correctness** finding; check against that guide rather than memory before reporting one.

## Validating

Validate the way `next.md` describes, on top of the project's own checks, and report whatever it leaves unchecked.
