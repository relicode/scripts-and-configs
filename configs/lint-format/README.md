# lint-format

A reusable lint/format stub for Bun + TypeScript projects. Copy this directory into a new repo, run `bun install`, and
`bun run lint` / `bun run format` work out of the box.

## Quick start

```sh
bun install
bun run lint     # eslint + prettier --check + tsc --noEmit (concurrent)
bun run format   # eslint --fix, then prettier --write (sequential)
bun test         # bun's built-in test runner
```

## What's covered

| Tool       | Handles                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| ESLint     | `.{js,mjs,cjs,jsx,ts,mts,cts,tsx}`, JSON / JSONC / JSON5, Markdown, CSS   |
| Prettier   | All of the above plus `.yaml` / `.yml`                                    |
| TypeScript | All `.ts*` files plus `.js*` (via `allowJs`, no type-checking by default) |

## Files

- `eslint.config.js` — flat config. React rules via `@eslint-react/eslint-plugin` (scoped to `.jsx`/`.tsx`); import
  sorting via `eslint-plugin-simple-import-sort`.
- `prettier.config.mjs` — `singleQuote`, `semi: false`, `trailingComma: 'es5'`, `printWidth: 120`.
- `tsconfig.json` — `strict`, `target: es2025`, `module: es2022`, `lib: ['es2025', 'dom']`, `noEmit`.
- `.prettierignore` — skips `node_modules`, `dist`, and helm chart paths (`charts/`, `templates/`, `Chart.yaml`,
  `Chart.lock`, `values*.yaml`).
- `src/`, `scripts/`, `__tests__/` — placeholder dirs with one minimal file each so `tsc --noEmit` has something to
  do. Replace with your real code.
- `__tests__/fixtures/` — one sample per lint-able file format (`.json`, `.jsonc`, `.json5`, `.md`, `.css`, `.yaml`).

## Scripts

| Script            | What it runs                                           |
| ----------------- | ------------------------------------------------------ |
| `lint`            | All `lint:*` scripts concurrently                      |
| `lint:eslint`     | `eslint`                                               |
| `lint:prettier`   | `prettier --check`                                     |
| `lint:typescript` | `tsc --noEmit`                                         |
| `format`          | `format:*` scripts sequentially (`eslint --fix` first) |
| `format:eslint`   | `eslint --fix`                                         |
| `format:prettier` | `prettier --write`                                     |

`format` runs sequentially because `eslint --fix` may rewrite code (e.g. reorder imports) and prettier should see the
final shape. `lint` runs concurrently for speed.

## Customizing

- **No React?** Drop the `eslintReact.configs.recommended` block from `eslint.config.js` and remove
  `@eslint-react/eslint-plugin` from `devDependencies`.
- **No DOM?** Set `lib: ["es2025"]` in `tsconfig.json` and drop `globals.browser` from `eslint.config.js`.
- **Helm / vendored trees?** The top-level `ignores` block in `eslint.config.js` already skips `**/charts/**`,
  `**/templates/**`, `submodules/**`, `dist/**`. Add more there as needed.
- **More file types?** Edit the prettier glob in `package.json` and add a matching `files` block in
  `eslint.config.js`.

## Known caveats

- `@eslint/json`'s `json/jsonc` parser rejects trailing commas, but prettier's `'es5'` setting emits them in
  `.jsonc`. Resolved by parsing `.jsonc` / `tsconfig*.json` / `.vscode/*.json` as JSON5 (a strict superset of JSONC).
- `tsc --noEmit` errors with `TS18003` if no input files match the includes — the placeholder `index.ts` files keep
  this happy.
- ESLint has no YAML language plugin configured; YAML files are only touched by prettier.
