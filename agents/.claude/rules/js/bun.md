---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
  - "**/package.json"
---

# Bun

Applies to code that Bun executes: files run with `bun <file>` or a `#!/usr/bin/env bun` shebang, `Bun.serve` servers and `bun test` suites. A `bun.lock` only means Bun installs the packages: frameworks such as Next.js still run on Node, and browser or React Native code never runs on Bun. When unsure, keep code runtime-neutral and don't use `Bun.*`.

## Tooling

- `bun <file>` runs a file, `bun run <script>` a package script, `bunx <package>` a package binary. `bun install` and `bun add` manage dependencies.
- Type-check with `tsc --noEmit` through the `lint` scripts, not with `bun check` or `bun --check`: a `check` script in `package.json` hijacks `bun check`, and `bun --check <file>` runs the file after checking it.
- New tests use `bun test` with `bun:test`. Leave existing Jest, Vitest or Playwright suites on their own runners.
- Bun loads `.env` files itself, so don't add `dotenv`.

## APIs

In new code, prefer Bun's built-ins to Node APIs and npm packages:

| Task | Use | Instead of |
| --- | --- | --- |
| Read and write files | `Bun.file(path).text()` / `.json()` / `.bytes()`, `Bun.write(path, data)` | `node:fs` `readFile` / `writeFile` |
| Run a process | `Bun.spawn({ cmd })` | `child_process.spawn` |
| Run a shell command | `` $`…` `` from `'bun'` | `child_process.exec`, `execa` |
| Current file and directory | `import.meta.path`, `import.meta.dir` | `fileURLToPath(import.meta.url)` with `path.dirname` |
| HTTP server, routes, WebSockets | `Bun.serve({ routes, websocket })` | `http.createServer`, `express`, `ws` |
| Frontend dev server and bundling | HTML imports with `Bun.serve`, `bun build` | Vite, webpack, esbuild |
| Password hashing | `Bun.password.hash` / `.verify` | `argon2`, `bcrypt` |
| Cryptographic hashing | `new Bun.CryptoHasher('sha256')` | `crypto.createHash` |
| Fast non-cryptographic hashing, such as cache keys | `Bun.hash` | `xxhash`, `murmurhash` |
| Environment | `Bun.env` | `process.env` |
| SQLite | `bun:sqlite` | `better-sqlite3` |
| Postgres | `Bun.sql` | `pg`, `postgres` |
| Redis | `Bun.redis` | `ioredis` |
| Globbing | `new Bun.Glob(pattern).scan({ cwd })` | `fast-glob`, `glob` |
| Waiting | `await Bun.sleep(ms)` | a `setTimeout` wrapped in a `Promise` |

- `node:*` imports are fine where Bun has no replacement: `node:path`, `node:os`, `node:fs/promises` for directories (`mkdir`, `readdir`, `rm`), and `fileURLToPath` / `pathToFileURL` from `node:url`. Parse URLs with the global `URL`.
- `Bun.*` only type-checks with `@types/bun` installed and `"bun"` in `compilerOptions.types`. If either is missing, don't use `Bun.*`: say so and suggest the setup.
- Frontend code type-checked with the rest needs `"DOM"` in `lib`, or a tsconfig of its own.
- Don't replace a dependency the project already relies on unless asked; mention the Bun alternative instead.
- Look up API details with `bun <command> --help` or at https://bun.com/docs.
