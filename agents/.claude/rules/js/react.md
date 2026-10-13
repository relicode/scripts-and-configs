---
paths:
  - "**/*.{tsx,jsx}"
---

# React

When you apply the `best-practices-react` guide:

- Fix what the code shows. Don't add memoization or caching on speculation: the guide itself says to measure first and optimize incrementally.
- Before applying a bundle rule, check whether the framework already handles it, for example Next.js `optimizePackageImports` for barrel imports.
- Its examples can lag library versions: confirm an import path exists before switching to it, and let the type-check decide.
- The house rules win over its style: adapt its examples to the project's conventions instead of pasting them.
