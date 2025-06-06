// eslint.config.example.js - Example usage in JavaScript and TypeScript projects

import noTruthyCollections from 'eslint-plugin-no-truthy-collections';
import tsParser from '@typescript-eslint/parser';

export default [
  // JavaScript files
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: {
      'no-truthy-collections': noTruthyCollections,
    },
    rules: {
      'no-truthy-collections/no-truthy-collections': 'error',
    },
  },

  // TypeScript files with enhanced detection
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json', // Enables type information for enhanced detection
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      'no-truthy-collections': noTruthyCollections,
    },
    rules: {
      'no-truthy-collections/no-truthy-collections': 'error',
    },
  },

  // Alternative: Use preset configurations
  {
    files: ['**/*.{js,ts,tsx}'],
    ...noTruthyCollections.configs.recommended,
  },

  // Example: Different config for test files
  {
    files: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}'],
    plugins: {
      'no-truthy-collections': noTruthyCollections,
    },
    rules: {
      // Maybe be less strict in tests
      'no-truthy-collections/no-truthy-collections': [
        'warn',
        {
          checkArrays: true,
          checkObjects: true,
          checkArrayLike: false, // Allow new Set() in tests
          strictNaming: false,
          allowExplicitBoolean: true,
        },
      ],
    },
  },

  // Example: Strict mode for src/ directory
  {
    files: ['src/**/*.{js,ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      'no-truthy-collections': noTruthyCollections,
    },
    rules: {
      'no-truthy-collections/no-truthy-collections': [
        'error',
        {
          checkArrays: true,
          checkObjects: true,
          checkArrayLike: true,
          strictNaming: true, // Extra strict for main source
          allowExplicitBoolean: false, // No !![] allowed
        },
      ],
    },
  },

  // TypeScript-specific preset (includes parser setup)
  {
    files: ['**/*.{ts,tsx}'],
    ...noTruthyCollections.configs.typescript,
  },
];
