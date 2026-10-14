---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
  - "**/*.astro"
  - "**/package.json"
  - "**/tsconfig*.json"
---

# TypeScript and JavaScript

In a file or module with an established style, that style wins over these rules, within the limits "Existing style wins" in `.claude/rules/clean-code.md` sets.

- Use `import`, never `require`. Where the test runner doesn't hoist mocks, as with `bun test`'s `mock.module`, a test loads the code under test after mocking with `await import()`, since static imports run before the test's own code. `.cjs` files are CommonJS and keep `require`.
- Import a module in one statement, with its types inline: `import { type Props, render } from './view'`. A module you import only for types gets `import type { Props } from './view'`, which compiles away; under `verbatimModuleSyntax`, `import { type Props }` on its own still loads the module.
- Write functions as arrow functions assigned to `const`. Single-expression bodies drop the braces: `const double = (n: number) => n * 2`. Use `function` only where arrows can't work: generators, overloads, assertion functions (`asserts x is T`), whose call sites otherwise fail to type-check, and functions that need their own `this`.
- Give optional parameters a default instead of handling `undefined` in the body:

  ```ts
  // Bad
  const twice = (s: string | undefined): string => (s ?? 'replaced') + (s ?? 'replaced')
  // Better
  const twice = (s?: string) => (s ?? 'replaced') + (s ?? 'replaced')
  // Best
  const twice = (s = 'replaced') => s + s
  ```

  A default replaces `undefined` only, so keep `??` where `null` can arrive. In React components and hooks, hoist object, array and function defaults to a constant: a literal default is a new reference on every render.

- Use `type Name = { … }`, not `interface`, except to merge into an existing declaration, which a `type` can't do: augmenting a module or a global (`declare module`, `declare global`, or a top-level interface in a `.d.ts`, such as `ImportMetaEnv` in `env.d.ts`).
- Use closures, not classes. Exceptions: framework subclasses, custom `Error` types, and libraries that require a class.
- Use `undefined` for absent values. Use `null` only where it's required or a library makes it the convention: `null` as a React node that renders nothing (`return null`, `cond ? <Badge /> : null`), `useRef<T>(null)`, and boundaries that already use it (database rows, native bridges, wire formats).
- Name default exports before exporting them: `const Thing = () => …; export default Thing`, never `export default () => …`. React DevTools and Fast Refresh need the name.
- Order files top-down: types, constants, styles and helpers above the code that uses them; the default-exported `const` and its `export default` at the bottom.
- Use `.tsx` only where JSX is needed; otherwise `.ts`. Name files `lowercase-with-dashes`, unless a framework dictates the name (`__root.tsx`, `$postId.tsx`, `[id].tsx`) or the folder already names its files another way, such as `PascalCase` component files.
- Use `camelCase` for variables and functions, `PascalCase` for types and components. Name a discriminant field you define `kind`, not `type`; keep `type` where the shape mirrors an outside format that calls it that, such as a DOM event or a Redux action.
- Trust inference: don't annotate what TypeScript already infers correctly. Where it infers `any`, as from `JSON.parse` or `response.json()`, annotate `unknown` or the real type. Annotate a return type only when the body doesn't make clear what the function returns.
- Avoid `any` when a real type is feasible. Narrow literals with `as const satisfies T`; use `as` only to cross a genuinely unknowable boundary.
- Don't use `@ts-ignore`, `@ts-expect-error`, `eslint-disable` or `biome-ignore` without a written reason, and never to hide a real bug.
- Keep constants at the top of the file that uses them. Literals shared across files and used as keys, discriminants or identifiers go in a constants module.
- Type a vocabulary of the project's own, a fixed set of strings it defines, as a string enum rather than a union of string literals. Values a library or a spec defines keep the type it exports, or one derived from it.
- Shape enums like `enum Status { ACTIVE = 'ACTIVE' }`: `PascalCase` type, `SCREAMING_SNAKE_CASE` members, each value equal to its member name. Runtime values then match the source, and TypeScript can't assign implicit numbers. Values that already exist outside the code, in stored data, URLs or a wire format, keep their spelling when they move into an enum. Enums need a compiler (Bun, a bundler or `tsc`); under Node's built-in type stripping, use an `as const` object instead.
- Await or explicitly handle every promise. No floating promises.
