---
paths:
  - "**/*.{tsx,jsx}"
---

# React

In a file or module with an established style, that style wins over these rules, within the limits "Existing style wins" in `.claude/rules/clean-code.md` sets.

## Effects

- An effect that subscribes, listens, starts a timer or fetches returns the cleanup that undoes it: unsubscribe, remove the listener, clear the timer, abort the request. Ink components are React too, so a TUI stops its stdin listeners and timers the same way before the app exits.
- An effect's dependency array lists everything its body reads and nothing it doesn't. A missing dependency makes it run on stale values; a needless one re-runs it, and re-runs the cleanup with it.
- Don't synchronize in an effect what a computation can derive: state that follows from props or other state is computed during render.

## Untrusted HTML and secrets

- `dangerouslySetInnerHTML`, and Astro's `set:html`, take only trusted or sanitized HTML.
- Nothing server-only reaches the browser. A build inlines every variable with a public prefix (`VITE_`, `PUBLIC_`, `NEXT_PUBLIC_`) into the bundle, and a value passed to a component or island that renders in the browser is serialized into the HTML, props included. Keep tokens and keys behind a server-side call.

## The performance guide

Where the React Compiler is on (`reactCompiler` in `next.config`, or `babel-plugin-react-compiler` in a Vite or Astro config), it memoizes components, hooks and callbacks itself: don't write `useMemo`, `useCallback` or `memo`, even where the `best-practices-react` guide's examples do. It memoizes on the identity of what the code captures, so capture stable values: a library's stable handler, such as a form field's `input.onChange`, rather than an object the library rebuilds on every render, such as `input` itself.

When you apply the `best-practices-react` guide:

- Fix what the code shows. Don't add memoization or caching on speculation: the guide itself says to measure first and optimize incrementally.
- Before applying a bundle rule, check whether the framework already handles it, for example Next.js `optimizePackageImports` for barrel imports.
- Its examples can lag library versions: confirm an import path exists before switching to it, and let the type-check decide.
- The house rules win over its style: adapt its examples to the project's conventions instead of pasting them.
