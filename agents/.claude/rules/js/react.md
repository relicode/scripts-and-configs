---
paths:
  - "**/*.{tsx,jsx}"
---

# React

Where the React Compiler is on (`reactCompiler` in `next.config`, or `babel-plugin-react-compiler` in a Vite or Astro config), it memoizes components, hooks and callbacks itself: don't write `useMemo`, `useCallback` or `memo`, even where the `best-practices-react` guide's examples do. It memoizes on the identity of what the code captures, so capture stable values: a library's stable handler, such as a form field's `input.onChange`, rather than an object the library rebuilds on every render, such as `input` itself.

When you apply the `best-practices-react` guide:

- Fix what the code shows. Don't add memoization or caching on speculation: the guide itself says to measure first and optimize incrementally.
- Before applying a bundle rule, check whether the framework already handles it, for example Next.js `optimizePackageImports` for barrel imports.
- Its examples can lag library versions: confirm an import path exists before switching to it, and let the type-check decide.
- The house rules win over its style: adapt its examples to the project's conventions instead of pasting them.
