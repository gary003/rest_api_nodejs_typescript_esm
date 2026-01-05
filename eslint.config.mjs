import eslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
  // ⬇️ GLOBAL ignores (PAS dans rules)
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/logs/**',
    ],
  },

  // ⬇️ TypeScript rules
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': eslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Code quality
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Style
      indent: ['error', 2],
      quotes: ['error', 'single'],
    },
  },
]
