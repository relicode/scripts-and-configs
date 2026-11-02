---
name: review-next
description: Next.js review specifics. Grades violations of the project's Next.js rule into the review categories: server actions and route handlers that trust their caller and open redirects as Security findings, Bun runtime APIs in app code and a client boundary pushed too high as Bad practices. Use together with review-generic, review-bun and review-react when reviewing Next.js code; preloaded by reviewer-next.
---

# Code review: Next.js

Extends `review-generic` and builds on `review-bun` and `review-react`, whose TypeScript and React checks apply to Next.js code too: same scope, phases and report, plus the grading below.

**Before you read any code**, check that `review-generic`, `review-bun`, `review-react`, `best-practices-bun` and `best-practices-react` are in your context in full, not just names in a skill list: a subagent normally has them preloaded, but a plain session or one started with `claude --agent` has only their names. For each one that's missing, read `.claude/skills/<name>/SKILL.md`; one already in your context needs no second read. If the file isn't there either, stop and name the missing skill. Don't start the review without them. Running this skill on its own is the cheaper route for something small — the agent is worth it once the work spans several files.

The standards, the docs to check API usage against and the extra validation steps are all in `.claude/rules/js/next.md`, which loads for every TypeScript and JavaScript file and applies only to the app's code.

## How to grade

Violations of `next.md` land in review-generic's categories like this:

- Its "Server entry points" and "Secrets" rules are **Security** findings, the Next.js form of what review-generic already lists: a server action or route handler that leaves authentication, authorization or input validation to the page, layout or middleware above it; a redirect target taken from user input without an allowlist; a server-only value in a `NEXT_PUBLIC_` variable or handed to a client component as a prop. Grade a missing authorization check 🔴 where it exposes another user's data or a privileged action.
- Its "Runtime" rule is a **Bad practices** finding: a Bun runtime API in app code, which runs on Node. Scripts and packages outside the app, which `bun.md` governs, are fine.
- Its "The client boundary" rule is a **Bad practices** finding, graded by what the boundary drags into the bundle — 🟠 where it pulls server-only modules across, 🟡 where it only costs bundle size.
- API usage that contradicts the shipped guide `next.md` points at is a **Correctness** finding; check against that guide rather than memory before reporting one.

## Validating

Validate the way `next.md` describes, on top of the project's own checks, and report whatever it leaves unchecked.
