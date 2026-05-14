# lint

Self-contained Bun lint/format wrapper around `prettier`, `eslint`, and `tsc`. Designed to be invoked from any project — uses the consumer's repo-local prettier/eslint configs when present, falls back to bundled ones otherwise.

`~/bin/lint` is a one-line shim that `exec bun`'s `lint.ts` here.

## Requirements

- [Bun](https://bun.sh) ≥ 1.3 (only when running from source; the shim invokes Bun directly).
- Nothing else — `eslint`, `prettier`, `concurrently`, `tsc`, `jiti`, and all eslint plugins live in this dir's bundled `node_modules/`. Anything on `$PATH` is overridden by the bundled `node_modules/.bin/`.

## Install

```sh
bun install
```

That's it — the `~/bin/lint` shim already points here.

## Usage

```sh
lint              # lint mode:    eslint  +  prettier --check .  +  tsc --noEmit  (concurrent)
lint -f|--format  # format mode:  eslint --fix  +  prettier --write .             (sequential)
lint -h|--help    # show inline help
```

Exit code propagates from the underlying tools — non-zero on any failure.

### Config resolution

For each tool, the consumer's repo-local config wins. If no repo-local config exists, the bundled fallback is used:

| Tool         | Repo-local detection                                                                                               | Fallback                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| **eslint**   | `eslint.config.{js,mjs,cjs,ts,mts,cts}` or `.eslintrc{,.js,.cjs,.json,.yaml,.yml}` or `package.json#eslintConfig`  | `./eslint.config.js`       |
| **prettier** | `.prettierrc{,.json,.js,.cjs,.mjs,.ts,.yaml,.yml}` or `prettier.config.{js,mjs,cjs,ts}` or `package.json#prettier` | `./prettier.config.mjs`    |
| **tsc**      | `./tsconfig.json` (cwd)                                                                                            | `./tsconfig.fallback.json` |

The tsc step runs when the consumer dir has a `tsconfig.json` **or** when a positional path looks like a TS file (`*.{ts,tsx,mts,cts}`). When tsc runs:

- With cwd's tsconfig and no positionals → vanilla `tsc --noEmit` (preserves the tsconfig's `include`/`exclude`).
- Otherwise → the helper writes a temp `.tsconfig.lint-<pid>.json` in cwd that `extends` either cwd's tsconfig.json or the bundled fallback, with `include` narrowed to the positional paths (or `**/*.{ts,tsx,mts,cts}` when no positionals are given but the fallback is in use). tsc gets `-p <temp>`. The temp file is unlinked on exit.

The fallback tsconfig (`./tsconfig.fallback.json`) carries strict-ish modern defaults — `strict`, `target: ESNext`, `moduleResolution: bundler`, etc. — and intentionally no `types`/`paths` so it's safe to extend from arbitrary consumer projects.

## Build a standalone binary

```sh
bun run build       # produces ./dist/lint (~98 MB; embeds the Bun runtime + lint.ts + configs)
```

The binary embeds `eslint.config.js`, `prettier.config.mjs`, and `tsconfig.fallback.json` as assets; Bun materializes them to real paths at runtime so the eslint, prettier, and tsc child processes can read them.

**Caveat — not portable on its own.** The embedded configs `import` packages (`@eslint/js`, `eslint-plugin-react`, `@ianvs/prettier-plugin-sort-imports`, etc.), and `eslint`/`prettier`/`tsc`/`concurrently` are external binaries. All of those resolve from the bundled `node_modules/` adjacent to the binary's _working directory_ (or `$PATH`). Moving `dist/lint` alone to a machine without the bundled `node_modules/` (or without those tools globally installed) will break config loading and tool invocation. Keep `dist/lint` and `node_modules/` together, or just keep using the `bun lint.ts` flow via `~/bin/lint`.

## Self-lint

From inside this dir:

```sh
lint        # runs eslint + prettier + tsc against helpers/lint/ itself
lint -f     # auto-fix
```

The bundled tsconfig.json exists, so `tsc --noEmit` is included.

## Files

- `lint.ts` — entry point (the `~/bin/lint` shim execs this).
- `eslint.config.js` — fallback eslint flat config.
- `prettier.config.mjs` — fallback prettier config (2-space, no-semi, single-quote, 120-col, with `@ianvs/prettier-plugin-sort-imports`).
- `tsconfig.fallback.json` — fallback tsconfig used when cwd has none (strict-ish modern defaults, no `types`/`paths`).
- `tsconfig.json` — for self-lint only.
- `package.json` + `bun.lock` + `node_modules/` — bundled toolchain.
