/**
 * Import sorting is handled by eslint-plugin-simple-import-sort (see eslint.config.js),
 * not a prettier plugin — keeps grouping configurable without forcing prettier to own AST.
 *
 * Nothing here is React-specific; the config applies as-is to non-React projects.
 *
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  trailingComma: 'es5',
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  printWidth: 120,
  overrides: [
    {
      // Biome formats .jsonc with `trailingCommas: 'none'` — align prettier to avoid a write-fight.
      files: ['*.jsonc'],
      options: { trailingComma: 'none' },
    },
  ],
}

export default config
