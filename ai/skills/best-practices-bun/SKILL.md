---
name: best-practices-bun
description: Performance practices for all TypeScript and JavaScript, since Bun is the toolchain everywhere. Covers async waterfalls, caching across requests, and hot-path techniques such as index maps, Set and Map lookups, hoisted regular expressions and toSorted. Use when writing or reviewing performance-sensitive TypeScript; preloaded by reviewer-bun, reviewer-react, reviewer-next, reviewer-astro, developer-bun, developer-react, developer-next and developer-astro, and the base that best-practices-react builds on.
license: MIT
---

# Best practices: TypeScript performance

Performance rules for any TypeScript, wherever it runs, grouped by impact. React and Next.js specifics live in `best-practices-react`, which builds on these.

Adapted from Vercel Engineering's react-best-practices (MIT, January 2026), via davila7/claude-code-templates at `b84033e`, with examples rewritten to follow the house rules. `LICENSE.txt` in this folder carries the license notice.

## Applying them

- Fix what the code shows. Don't add caching or micro-optimizations on speculation: measure, and spend effort where it matters. The hot-path rules only pay off in code that runs often, except `toSorted()`, which is about not mutating and applies everywhere.
- The rules recommend two libraries, as Vercel does: [better-all](https://github.com/shuding/better-all) for dependency-based parallelism and [lru-cache](https://github.com/isaacs/node-lru-cache) for caching across requests. Use them unless the project already has an equivalent; in a review, or in a developer agent's change that didn't ask for one, adding one is a decision to confirm.

## Rules

The full rules, with incorrect and correct examples, are in `references/typescript-performance-guidelines.md` in this skill's base directory.

1. **Eliminating waterfalls** (CRITICAL): each sequential `await` adds the full latency of what it waits for.
   - Defer `await` until a branch needs the value
   - Start dependent work as soon as its own inputs are ready
   - Start independent work at once in request handlers
   - `Promise.all()` for independent operations
2. **Caching across requests** (HIGH): a bounded LRU cache for data that sequential requests share.
3. **Hot paths** (LOW-MEDIUM):
   - Index maps instead of repeated `find()`
   - Read nested properties once, before the loop
   - Memoize repeated pure calls
   - One pass instead of several `filter()` and `map()` calls
   - Compare lengths before comparing arrays expensively
   - Return as soon as the result is known
   - Hoist regular expressions
   - One pass for min and max instead of sorting
   - `Set` and `Map` for repeated membership checks
   - `toSorted()` instead of `sort()`, which mutates
