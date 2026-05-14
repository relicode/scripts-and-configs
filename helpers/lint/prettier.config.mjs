import { createRequire } from 'node:module'

// Prettier resolves plugin names from cwd, not from the config file's directory.
// Resolve the plugin to an absolute path here so it loads regardless of cwd
// (this config is used as a fallback by ../bin shim from arbitrary working dirs).
const require = createRequire(import.meta.url)
const sortImportsPlugin = require.resolve('@ianvs/prettier-plugin-sort-imports')

/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  trailingComma: 'es5',
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  printWidth: 120,
  plugins: [sortImportsPlugin],
  importOrder: [
    '^[^.$]', // Third-party libraries (anything not starting with . or $)
    '', // Blank line
    '^\\$/(.*)$', // Local aliased imports starting with $/
    '^[.]', // Relative imports (starting with .)
  ],
}

export default config
