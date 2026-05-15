/**
 * Import sorting is handled by eslint-plugin-simple-import-sort (see eslint.config.js),
 * not a prettier plugin — keeps grouping configurable without forcing prettier to own AST.
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
}

export default config
