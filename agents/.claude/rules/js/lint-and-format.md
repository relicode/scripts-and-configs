---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,css,scss,json,jsonc}"
  - "**/*.astro"
  - "**/*.mdx"
---

# Lint and format

Every JS/TS project defines its checks as `package.json` scripts named `lint[:<specific>]` and `format[:<specific>]`, for example:

```json
"lint": "turbo run lint && bun run --parallel --no-exit-on-error 'lint:*'",
"lint:biome": "biome check --error-on-warnings",
"lint:scripts": "tsc --noEmit -p scripts/tsconfig.json",
"format": "biome check --write"
```

`lint` includes the type-checks. `bun run --parallel 'lint:*'` needs at least one `lint:*` script, and `--no-exit-on-error` keeps one failing leg from cutting the others short.

- Run the scripts with the project's package manager: `bun run` in Bun projects, `npm run` or `pnpm run` where the lockfile says so.
- Check code through these scripts, not by calling Biome, Prettier, ESLint or `tsc` yourself: the scripts know the project's configs, workspaces and tsconfig projects.
- In a monorepo, a package can leave a check to the workspace root, such as a repo-wide Biome pass that leaves the package no `format` script of its own. Run each check where it's defined, from the root for the root's scripts: the same tool run from inside a package may reach only that package.
- Run `format` first, exactly as defined. Never append file arguments to a package script: depending on how it's written, extra arguments get executed, ignored or passed to every package. If it reformats files outside your change, mention them. It can exit non-zero while unfixable problems remain; `lint` reports them.
- Then run `lint`. It must pass for the files you changed. Failures elsewhere that were already there aren't yours to fix: report them.
- Run the tests of the package you changed, through its `test` script. Never run another runner's tests with `bun test`.
- Say which checks actually ran, and name changed files they skip: Biome and `tsc` pick files by extension and skip the ones they can't handle, such as `.scss` and `.mdx` files and scripts without an extension. If `lint` has no type-check leg, also run the project's `tsc --noEmit` (`bunx tsc` or `npx tsc`) and say the leg is missing.
- A task runner's cache, such as turbo's, replays a task whose inputs haven't changed (`cache hit, replaying logs`), so that pass is an earlier run's. When what you changed isn't among the task's inputs, such as a file outside every package, or a test depends on the date, run it again without the cache (turbo's `--force`) before counting it.
- If `lint` or `format` is missing, in the package and at the workspace root, say so: every project is expected to have both. Until then, run the tools the project already configures (Biome, ESLint, `tsc`) on the files you changed, and install nothing.
