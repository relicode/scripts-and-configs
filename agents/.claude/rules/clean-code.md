# Clean code

How to write and change code in this project. Reviewers check changes against it.

## Existing style wins

- In a file or module with an established style, new and changed code follows that style, even where the house rules in `.claude/rules/` say otherwise.
- The house rules apply to new files and to code without an established pattern.
- Style means conventions that don't change behavior, such as naming, declaration forms, file layout and idioms. It never excuses bugs, security holes, failing checks or bad practices such as loose types, swallowed errors and floating promises.

## Principles

- Give each function, module and component one responsibility.
- Build the simplest thing that works. Don't add features, options or abstractions for needs that don't exist yet.
- Extract duplicated logic once a second copy appears; one-liners stay inline.
- When requirements are unclear, ask instead of guessing.
- Leave the lines you change cleaner than you found them. Don't rewrite code the task doesn't touch.

## Naming

- Names reveal intent: `userCount`, not `n`. If a name needs a comment, rename it.
- Functions are verb + noun (`getUserById`). Booleans read as questions (`isActive`, `hasPermission`, `canEdit`).
- No magic numbers or strings: give meaningful literals a named constant, cased the way the language does it.

## Functions and structure

- Keep functions small and at one level of abstraction: aim for 5–20 lines and at most 3 parameters.
- Don't mutate inputs or hide side effects.
- Prefer guard clauses and early returns to nesting; stay within 2 levels.
- Prefer immutable data. No global or top-level mutable state; framework singletons such as an app, router or logger are fine.
- Write asynchronous code in the language's direct style (`async`/`await`, coroutines), not callback chains.
- Keep related code together: no factories for two objects, and no utils file for a single function.

## Comments and docs

- Comment _why_, never _what_. Delete comments that restate the code.
- Point at code by symbol name and at docs by heading, not by line number, which drifts with the next edit. Where neither fits, add a named anchor comment and point at that. Links pinned to a commit are fine, and so are line numbers in chat, reports and commit messages, which describe one moment.

## Before editing a file

- Check what imports it, what it imports, and which tests cover it.
- Update every dependent in the same change. Never leave broken imports or call sites behind.

## Before saying you're done

- The change does what was asked, and only that.
- Every affected file is updated.
- Tests pass, and so do the project's format and lint checks.
- A check counts only if it could have come out the other way: a new test for a fix fails without the fix, a claim about source code is checked in the source rather than in build output, and a replayed cached run checked nothing new.
- Run code and commands only when that's safe: nothing that deletes, deploys or migrates, and no call to a real service beyond plain reads, such as a build or page load that only fetches data. A dev database isn't limited: writing to it, migrating it and resetting it are fine. Install only the project's packages or one the task asks for. Use a dry run if there is one, and say what you didn't run.
- "Nothing that deletes" leaves out the files the task removes, anything you created, and what the project's own checks and builds delete and recreate, such as `coverage/`, build output or a test database. Everything else, inside the working tree or outside it, stays off limits, such as snapshots deleted to get a check passing and uploaded files.
- Take great care not to expose passwords or other credentials, above all when reading production data: pass them through environment variables rather than writing them into commands, don't print them or select columns that hold them, such as password hashes and API tokens, and don't copy them into code, docs or logs.
- Edge cases are handled, or called out explicitly.
