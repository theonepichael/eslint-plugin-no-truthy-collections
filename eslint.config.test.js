// eslint.config.test.js - Test your plugin on itself
// Run with: npx eslint --config eslint.config.test.js lib/

import noTruthyCollections from './lib/index.js';

export default [
  {
    files: ['lib/**/*.js'],
    plugins: {
      'no-truthy-collections': noTruthyCollections,
    },
    rules: {
      'no-truthy-collections/no-truthy-collections': 'error',
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
  },
];
