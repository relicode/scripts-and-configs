---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
  - "**/*.astro"
  - "**/package.json"
  - "**/tsconfig*.json"
---

# TypeScript and JavaScript

In a file or module with an established style, that style wins over these rules, within the limits "Existing style wins" in `.claude/rules/clean-code.md` sets.

- Use `import`, never `require`. `.cjs` files are CommonJS and keep `require`.
- Write functions as arrow functions assigned to `const`. Single-expression bodies drop the braces: `const double = (n: number) => n * 2`. Use `function` only where arrows can't work: generators, overloads, and assertion functions (`asserts x is T`), whose call sites otherwise fail to type-check.
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

- Use `type Name = { … }`, not `interface`.
- Use closures, not classes. Exceptions: framework subclasses, custom `Error` types, and libraries that require a class.
- Use `undefined` for absent values. Use `null` only where it's required or a library makes it the convention: `null` as a React node that renders nothing (`return null`, `cond ? <Badge /> : null`), `useRef<T>(null)`, and boundaries that already use it (database rows, native bridges, wire formats).
- Name default exports before exporting them: `const Thing = () => …; export default Thing`, never `export default () => …`. React DevTools and Fast Refresh need the name.
- Order files top-down: types, constants, styles and helpers above the code that uses them; the default-exported `const` and its `export default` at the bottom.
- Use `.tsx` only where JSX is needed; otherwise `.ts`. Name files `lowercase-with-dashes`, unless a framework dictates the name (`__root.tsx`, `$postId.tsx`, `[id].tsx`).
- Use `camelCase` for variables and functions, `PascalCase` for types and components.
- Trust inference: don't annotate what TypeScript already infers correctly. Where it infers `any`, as from `JSON.parse` or `response.json()`, annotate `unknown` or the real type. Annotate a return type only when the body doesn't make clear what the function returns.
- Avoid `any` when a real type is feasible. Narrow literals with `as const satisfies T`; use `as` only to cross a genuinely unknowable boundary.
- Don't use `@ts-ignore`, `@ts-expect-error`, `eslint-disable` or `biome-ignore` without a written reason, and never to hide a real bug.
- Keep constants at the top of the file that uses them. Literals shared across files and used as keys, discriminants or identifiers go in a constants module, ideally as enum members.
- Shape enums like `enum Status { ACTIVE = 'ACTIVE' }`: `PascalCase` type, `SCREAMING_SNAKE_CASE` members, each value equal to its member name. Runtime values then match the source, and TypeScript can't assign implicit numbers. Enums need a compiler (Bun, a bundler or `tsc`); under Node's built-in type stripping, use an `as const` object instead.
- Await or explicitly handle every promise. No floating promises.
