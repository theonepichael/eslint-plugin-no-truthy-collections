// eslint.config.typescript.example.js
// Example ESLint configuration for TypeScript projects with enhanced detection

import noTruthyCollections from 'eslint-plugin-no-truthy-collections';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  // TypeScript files with full type checking
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'no-truthy-collections': noTruthyCollections,
    },
    rules: {
      // Enhanced detection with TypeScript type information
      'no-truthy-collections/no-truthy-collections': 'error',

      // Recommended TypeScript rules that work well together
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // JavaScript files (fallback without type checking)
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: {
      'no-truthy-collections': noTruthyCollections,
    },
    rules: {
      'no-truthy-collections/no-truthy-collections': 'error',
    },
  },

  // Alternative: Use the built-in TypeScript preset
  {
    files: ['**/*.{ts,tsx}'],
    ...noTruthyCollections.configs.typescript,
  },
];
