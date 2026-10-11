---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
  - "**/*.astro"
  - "**/package.json"
---

# Bun

Bun is the toolchain for all TypeScript and JavaScript: it installs packages, runs scripts and runs tests, unless a project's lockfile shows another package manager. Its runtime APIs are narrower: they only exist in code Bun executes, meaning files run with `bun <file>` or a Bun shebang such as `#!/usr/bin/env bun`, `Bun.serve` servers and `bun test` suites. Frameworks such as Next.js still run on Node, and browser or React Native code never runs on Bun. When unsure, keep code runtime-neutral and don't use `Bun.*`.

## Tooling

- `bun <file>` runs a file, `bun run <script>` a package script, `bunx <package>` a package binary. `bun install` and `bun add` manage dependencies.
- Type-check with `tsc --noEmit` through the `lint` scripts, not with `bun check` or `bun --check`: a `check` script in `package.json` hijacks `bun check`, and `bun --check <file>` runs the file after checking it.
- New tests use `bun test` with `bun:test` where the package's `test` script runs `bun test`. In a package on Jest, Vitest or Playwright, write them for that runner.
- In code Bun executes, Bun loads `.env` files itself, so don't add `dotenv` there.

## Scripts

TypeScript and JavaScript scripts follow `.claude/rules/scripts.md`. Where Bun is the toolchain, they start with `#!/usr/bin/env bun`:

```ts
#!/usr/bin/env bun

import { parseArgs } from 'node:util'

const USAGE = `Usage: resize-images <folder> [--width <px>]

Resizes every image in <folder> to the given width.`

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: { help: { type: 'boolean', short: 'h' }, width: { type: 'string' } },
})

if (values.help) {
  console.log(USAGE)
  process.exit(0)
}
```

A wrapper hands `parseArgs` only the arguments before the command it runs. Where Node runs the script instead, it starts with `#!/usr/bin/env node`, reads `process.argv` and is written in JavaScript, unless the project already runs TypeScript scripts another way, such as `tsx`: Node's own TypeScript support needs erasable syntax and `.ts` import paths, which `tsc` refuses by default.

## APIs

In new code that Bun executes, prefer Bun's built-ins to Node APIs and npm packages:

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

## Processes

`Bun.spawn({ cmd: [...] })`, and Node's `spawn` and `execFile` in code Node runs, start no shell, and `` $`…` `` escapes what it interpolates. That stops shell metacharacters and nothing else:

- Never pass untrusted values through `` ${{ raw: value }} ``, which skips escaping.
- Interpolate untrusted values only as strings or arrays of strings, typed as such: an object from parsed JSON or a request body, even inside an array, can carry its own `raw` key and inject a command.
- Validate untrusted values that can start with `-`, or end the options before them the way the command expects (`--`, or git's `--end-of-options` before revisions): they otherwise become options such as `--output=…`.
- Never take the command itself, `cwd` or `env` from untrusted input, and never build command strings by hand for `sh -c`, `bash -c`, Node's `exec` or `shell: true`.
- With `Bun.spawn`, await `exited`, drain or pipe stdout and stderr, and check the exit code. `$` throws on a non-zero exit unless you add `.nothrow()`, and then you check `exitCode`.
