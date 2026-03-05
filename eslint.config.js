import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import astroPlugin from 'eslint-plugin-astro';
import prettierConfig from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.vercel/**',
      '.astro/**',
      '*.config.js',
      '*.config.ts',
    ],
  },

  // Base JavaScript rules
  eslint.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        CustomEvent: 'readonly',
        EventListener: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        // Node globals
        process: 'readonly',
        Buffer: 'readonly',
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        test: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'unused-imports': unusedImports,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-redeclare': 'off',
      'no-undef': 'off', // TypeScript handles this
      'no-use-before-define': [
        'error',
        { functions: false, classes: true, variables: true, allowNamedExports: false },
      ],
    },
  },

  // Node scripts
  {
    files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
    },
  },

  // Astro files
  ...astroPlugin.configs.recommended,
  {
    files: ['**/*.astro'],
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-use-before-define': [
        'error',
        { functions: false, classes: true, variables: true, allowNamedExports: false },
      ],
    },
  },

  // Prettier compatibility (must be last)
  prettierConfig,
];
