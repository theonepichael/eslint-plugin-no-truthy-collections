/**
 * ESLint Plugin: no-truthy-collections
 *
 * Prevents dangerous boolean coercion of arrays and objects in JavaScript and TypeScript.
 * Enhanced detection with TypeScript type information when available.
 *
 * @see https://github.com/theonepichael/eslint-plugin-no-truthy-collections
 */

import noTruthyCollections from './rules/no-truthy-collections.js';

export default {
  rules: {
    'no-truthy-collections': noTruthyCollections,
  },
  configs: {
    recommended: {
      name: 'no-truthy-collections/recommended',
      plugins: {
        'no-truthy-collections': noTruthyCollections,
      },
      rules: {
        'no-truthy-collections/no-truthy-collections': 'error',
      },
    },
    strict: {
      name: 'no-truthy-collections/strict',
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
            strictNaming: true,
            allowExplicitBoolean: false,
          },
        ],
      },
    },
    typescript: {
      name: 'no-truthy-collections/typescript',
      plugins: {
        'no-truthy-collections': noTruthyCollections,
      },
      languageOptions: {
        parser: '@typescript-eslint/parser',
        parserOptions: {
          project: true,
        },
      },
      rules: {
        'no-truthy-collections/no-truthy-collections': 'error',
      },
    },
  },
};
