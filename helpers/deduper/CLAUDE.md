@AGENTS.md

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Project layout

- `src/index.tsx` — entry. meow CLI parsing, extracts fclones passthrough from a `-- <fclones args> --` bracket (0 or 2 `--` tokens; anything else is rejected), then either runs the no-tui report or dynamically imports `ink` + `App.tsx` to render the TUI.
- `src/App.tsx` — ink TUI (browse → confirm → delete → done).
- `src/fclones.ts` — `Bun.$` wrapper around `fclones group --format json` and `rm`.
- `src/priority.ts` — pure helpers (formatBytes, priorityScore, pickKeeper). Kept ink-free so the no-tui path can import without pulling React.
- `scripts/build.ts` — programmatic `Bun.build` with a plugin (CLI `bun build --compile` doesn't accept plugins).
- `scripts/stub-react-devtools.ts` — bundler plugin that aliases `react-devtools-core` to an empty shim.

## Build

`bun run build` cross-compiles four single-file Bun executables in parallel:

- `dist/deduper-linux-x64` (~99 MB)
- `dist/deduper-linux-arm64` (~99 MB)
- `dist/deduper-darwin-x64` (~67 MB)
- `dist/deduper-darwin-arm64` (~62 MB)

Each binary embeds the Bun runtime — end users do not need Bun installed, only `fclones` on `PATH`.

## Pitfalls (verified against this codebase)

- **`react-devtools-core`**: ink statically imports it from `devtools.js`, which is dynamically loaded only when `process.env.DEV === 'true'`. Bun's compiler still resolves the static import at bundle time. We stub it via a build plugin in `scripts/stub-react-devtools.ts` — do not switch to `--external`, which fails at runtime with "Cannot find package".
- **Bun shell `rm` does not accept `--`**: invoking ``await $`rm -- ${path}` `` returns `rm: illegal option -- -`. fclones always emits absolute paths (leading `/`), so `removeFile` in `src/fclones.ts` uses `rm ${path}` without the POSIX end-of-options sentinel.
- **fclones JSON shape**: `groups[i].files` is an array of strings (paths), _not_ an array of objects. Matches `fclones 0.35.0`.
- **Passthrough flags**: anything between a pair of `--` tokens on the deduper CLI is forwarded as-is to `fclones group` via `Bun.$` array interpolation, with paths trailing the closing `--` (e.g. `deduper -- --min 1M -- ./a ./b`). Any count of `--` tokens other than 0 or 2 is rejected with a usage error and exit code 2.
- **Priority semantics**: first dir wins. Done client-side in `pickKeeper` (lowest `priorityScore` is kept). We deliberately do NOT use `fclones remove --priority`, because the TUI hands deletion control to the user.
