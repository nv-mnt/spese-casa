/**
 * Regole di lint del frontend (flat config, ESLint 9).
 *
 * Tiene la barra su cio' che rompe davvero: hook di React usati male,
 * variabili morte, `any` di comodo. Lo stile lo decide Prettier a parte.
 */

import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // I test E2E girano in Node e parlano con Playwright: altre globali.
  {
    files: ['e2e/**/*.ts', '*.config.ts', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
