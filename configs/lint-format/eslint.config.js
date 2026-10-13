import css from '@eslint/css'
import js from '@eslint/js'
import json from '@eslint/json'
import markdown from '@eslint/markdown'
// React-only: drop the next import for non-React projects
import eslintReact from '@eslint-react/eslint-plugin'
import { defineConfig } from 'eslint/config'
// React-only: drop the next import for non-React projects
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  { ignores: ['**/charts/**', '**/templates/**', 'submodules/**', 'dist/**'] },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { js, 'simple-import-sort': simpleImportSort },
    extends: ['js/recommended'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'], // side-effect imports (e.g. `import 'foo'`)
            ['^node:', '^@?\\w'], // node: builtins + scoped/named packages
            ['^\\$/'], // local `$/` aliases
            ['^\\.'], // relative
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
  tseslint.configs.recommended,
  // React-only: drop the next two entries for non-React projects
  {
    files: ['**/*.{jsx,tsx}'],
    ...eslintReact.configs.recommended,
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },
  // End React-only
  {
    files: ['**/*.json'],
    ignores: ['**/tsconfig*.json', '**/.vscode/*.json'],
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended'],
  },
  {
    // json5 is a strict superset of jsonc (comments + trailing commas) — agrees with prettier defaults
    files: ['**/*.jsonc', '**/tsconfig*.json', '**/.vscode/*.json'],
    plugins: { json },
    language: 'json/json5',
    extends: ['json/recommended'],
  },
  { files: ['**/*.json5'], plugins: { json }, language: 'json/json5', extends: ['json/recommended'] },
  { files: ['**/*.md'], plugins: { markdown }, language: 'markdown/gfm', extends: ['markdown/recommended'] },
  { files: ['**/*.css'], plugins: { css }, language: 'css/css', extends: ['css/recommended'] },
])
