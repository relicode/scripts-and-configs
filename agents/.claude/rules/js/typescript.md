---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
  - "**/package.json"
  - "**/tsconfig*.json"
---

# TypeScript and JavaScript

- Use `import`, never `require`. `.cjs` files are CommonJS and keep `require`.
- Write functions as arrow functions assigned to `const`. Single-expression bodies drop the braces: `const double = (n: number) => n * 2`. Use `function` only where arrows can't work: generators, overloads, and assertion functions (`asserts x is T`), whose call sites otherwise fail to type-check.
- Use `type Name = { … }`, not `interface`.
- Use closures, not classes. Exceptions: framework subclasses, custom `Error` types, and libraries that require a class.
- Use `undefined` for absent values in code we own. Keep `null` for boundaries that already use it (database rows, native bridges, wire formats) and for React refs (`useRef<T>(null)`).
- Name default exports before exporting them: `const Thing = () => …; export default Thing`, never `export default () => …`. React DevTools and Fast Refresh need the name.
- Order files top-down: types, constants, styles and helpers above the code that uses them; the default-exported `const` and its `export default` at the bottom.
- Use `.tsx` only where JSX is needed; otherwise `.ts`. Name files `lowercase-with-dashes`, unless a framework dictates the name (`__root.tsx`, `$postId.tsx`, `[id].tsx`).
- Use `camelCase` for variables and functions, `PascalCase` for types and components.
- Avoid `any` when a real type is feasible. Narrow literals with `as const satisfies T`; use `as` only to cross a genuinely unknowable boundary.
- Don't use `@ts-ignore`, `@ts-expect-error`, `eslint-disable` or `biome-ignore` without a written reason, and never to hide a real bug.
- Keep constants at the top of the file that uses them. Literals shared across files and used as keys, discriminants or identifiers go in a constants module, ideally as enum members.
- Shape enums like `enum Status { ACTIVE = 'ACTIVE' }`: `PascalCase` type, `SCREAMING_SNAKE_CASE` members, each value equal to its member name. Runtime values then match the source, and TypeScript can't assign implicit numbers. Enums need a compiler (Bun, a bundler or `tsc`); under Node's built-in type stripping, use an `as const` object instead.
- Await or explicitly handle every promise. No floating promises.
