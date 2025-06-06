# TypeScript Setup Guide

This plugin provides **enhanced detection** when used with TypeScript type information.

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install --save-dev eslint-plugin-no-truthy-collections @typescript-eslint/parser
# or
bun add --dev eslint-plugin-no-truthy-collections @typescript-eslint/parser
```

### 2. Configure ESLint

```javascript
// eslint.config.js
import noTruthyCollections from 'eslint-plugin-no-truthy-collections';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json', // This enables type checking!
      },
    },
    plugins: {
      'no-truthy-collections': noTruthyCollections,
    },
    rules: {
      'no-truthy-collections/no-truthy-collections': 'error',
    },
  },
];
```

### 3. Use the TypeScript Preset (Alternative)

```javascript
// eslint.config.js
import noTruthyCollections from 'eslint-plugin-no-truthy-collections';

export default [
  {
    files: ['**/*.{ts,tsx}'],
    ...noTruthyCollections.configs.typescript, // Includes parser setup
  },
];
```

## ⚡ Enhanced Detection Examples

With TypeScript type information, the plugin can detect issues that pure AST analysis cannot:

### Function Parameters

```typescript
// ❌ Detected via TypeScript types
function processUsers(users: User[]) {
  if (users) {
    // 🚨 Rule knows 'users' is an array type
    return users.filter(u => u.active);
  }
}

// ✅ Proper check
function processUsers(users: User[]) {
  if (users.length > 0) {
    return users.filter(u => u.active);
  }
}
```

### Interface Properties

```typescript
interface Config {
  settings: Record<string, any>;
  options: { [key: string]: unknown };
}

function applyConfig(config: Config) {
  // ❌ Both detected via TypeScript type information
  if (config.settings) {
  } // 🚨 Record<> type detected
  if (config.options) {
  } // 🚨 Index signature detected
}
```

### Generic Constraints

```typescript
// ❌ Detected via generic constraint
function isEmpty<T extends any[]>(collection: T) {
  if (collection) {
    // 🚨 T extends any[] = array type
    return false;
  }
  return true;
}

// ✅ Proper implementation
function isEmpty<T extends any[]>(collection: T) {
  return collection.length === 0;
}
```

### Type Aliases

```typescript
type StringArray = string[];
type NumberList = number[];
type ConfigMap = Record<string, any>;

// ❌ All detected via type aliases
const names: StringArray = [];
const scores: NumberList = [];
const config: ConfigMap = {};

if (names) {
} // 🚨 StringArray = string[]
if (scores) {
} // 🚨 NumberList = number[]
if (config) {
} // 🚨 ConfigMap = Record<>
```

## 🔧 Troubleshooting

### "Type information not available"

If enhanced detection isn't working:

1. **Check TypeScript parser setup:**

   ```javascript
   languageOptions: {
     parser: tsParser,
     parserOptions: {
       project: './tsconfig.json',  // ← This is required!
     },
   }
   ```

2. **Verify tsconfig.json includes your files:**

   ```json
   {
     "include": ["src/**/*", "tests/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

3. **Check file patterns match:**
   ```javascript
   {
     files: ['**/*.{ts,tsx}'],  // ← Must match your TypeScript files
     // ...
   }
   ```

### Performance Considerations

Type checking adds some overhead. For large projects:

```javascript
// Option 1: Enable only for src/ directory
{
  files: ['src/**/*.{ts,tsx}'],
  // ... TypeScript config
}

// Option 2: Exclude test files from type checking
{
  files: ['**/*.{ts,tsx}'],
  ignores: ['**/*.test.ts', '**/*.spec.ts'],
  // ... TypeScript config
}
```

## 🎯 Best Practices

1. **Use TypeScript preset for new projects**
2. **Enable type checking for main source code**
3. **Consider lighter config for test files**
4. **Combine with other TypeScript ESLint rules**

```javascript
// Recommended combination
import noTruthyCollections from 'eslint-plugin-no-truthy-collections';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
      'no-truthy-collections': noTruthyCollections,
    },
    rules: {
      // Enhanced truthy collection detection
      'no-truthy-collections/no-truthy-collections': 'error',

      // Complementary TypeScript rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'warn',
    },
  },
];
```
