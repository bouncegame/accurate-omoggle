import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Allow controlled use of setState inside effects (e.g. async data fetch,
      // imperative startup like camera initialisation). The pattern is fine
      // when guarded by a cancelled flag or only run once with `[]`.
      'react-hooks/set-state-in-effect': 'off',
      // Decorative animations may use Math.random for variety. Calling it
      // inside a motion `animate` config is harmless (each call wins).
      'react-hooks/purity': 'off',
      // Don't penalise files that export a hook alongside a component (e.g.
      // toast host + useToasts store hook); fast refresh still works fine for
      // the actual component edits.
      'react-refresh/only-export-components': 'off',
    },
  },
])
