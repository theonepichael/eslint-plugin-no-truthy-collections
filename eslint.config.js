// eslint.config.js - For linting this plugin's own code

import prettierConfig from 'eslint-config-prettier';

export default [
  {
    files: ['lib/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      // Basic ESLint rules for clean code
      'no-unused-vars': 'error',
      'no-console': 'off',  // Allow console in our rule
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Import/export rules
      'no-duplicate-imports': 'error',
      
      // Potential issues
      'no-unused-expressions': 'error',
      'no-unreachable': 'error',
      'eqeqeq': 'error',
      
      // Let Prettier handle formatting
      ...prettierConfig.rules,
    },
  },
  
  // Ignore generated/build files
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '*.min.js',
    ],
  },
];