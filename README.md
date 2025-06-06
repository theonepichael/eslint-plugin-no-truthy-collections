# eslint-plugin-no-truthy-collections

🚀 **ESLint plugin that prevents dangerous boolean coercion of arrays and objects in JavaScript and TypeScript**

## Rules

### `no-truthy-collections`

Prevents dangerous boolean coercion of arrays and objects in JavaScript and TypeScript. Arrays and objects are always truthy in JS, even when empty - this catches common bugs from developers expecting Python-like falsy behavior.

#### ❌ Problematic Code

```javascript
// Arrays are always truthy, even when empty!
if (items) {          // 🐛 Always true, even for []
  render(items);
}

// Objects are always truthy, even when empty!  
if (config) {         // 🐛 Always true, even for {}
  applyConfig(config);
}

// Array-like objects too!
if (new Set()) {      // 🐛 Always true, even when empty
  processSet();
}
```

#### ✅ Correct Code

```javascript
// Check for actual content
if (items.length > 0) {
  render(items);
}

// Check for actual properties
if (Object.keys(config).length > 0) {
  applyConfig(config);
}

// Check for actual size
if (mySet.size > 0) {
  processSet();
}
```

## TypeScript Support ⚡

Enhanced detection when using TypeScript with type information:

```typescript
// Standard detection (works in JS too)
if ([]) { }                    // 🚨 Always flagged

// Enhanced TypeScript detection via type information
function processItems(items: string[]) {
  if (items) { }               // 🚨 Detected via TypeScript types
    return items.map(x => x.toUpperCase());
  }
}

// Interface types  
interface Config {
  settings: Record<string, any>;
}
const config: Config = { settings: {} };
if (config.settings) { }      // 🚨 Detected via TypeScript types

// Generic constraints
function check<T extends any[]>(arr: T) {
  if (arr) { }                 // 🚨 Enhanced detection with generics
    return arr.length;
  }
}

// Union types (smart handling)
let items: string[] | null = [];
if (items) { }                 // ✅ Valid null check (not flagged)
```

## Installation

```bash
npm install --save-dev eslint-plugin-no-truthy-collections
# or
bun add --dev eslint-plugin-no-truthy-collections
```

## Usage

### JavaScript Projects

```javascript
// eslint.config.js
import noTruthyCollections from 'eslint-plugin-no-truthy-collections';

export default [
  {
    plugins: {
      'no-truthy-collections': noTruthyCollections,
    },
    rules: {
      'no-truthy-collections/no-truthy-collections': 'error',
    },
  },
];
```

### TypeScript Projects (Recommended)

```javascript
// eslint.config.js  
import noTruthyCollections from 'eslint-plugin-no-truthy-collections';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',  // Enables enhanced type detection
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

> 💡 **See [`eslint.config.typescript.example.js`](./eslint.config.typescript.example.js) for a complete TypeScript setup example**

### Using Preset Configurations

```javascript
// eslint.config.js  
import noTruthyCollections from 'eslint-plugin-no-truthy-collections';

export default [
  // Recommended preset
  {
    plugins: { 'no-truthy-collections': noTruthyCollections },
    ...noTruthyCollections.configs.recommended,
  },
  
  // Or strict preset (includes naming checks)
  {
    plugins: { 'no-truthy-collections': noTruthyCollections },
    ...noTruthyCollections.configs.strict,
  },
];
```

## Configuration Options

```javascript
{
  'no-truthy-collections/no-truthy-collections': ['error', {
    checkArrays: true,           // Check array literals and constructors
    checkObjects: true,          // Check object literals and constructors  
    checkArrayLike: true,        // Check Set, Map, etc.
    strictNaming: false,         // Check variable names for collection hints
    allowExplicitBoolean: true,  // Allow Boolean() and !! coercion
  }]
}
```

### Option Details

| Option | Default | Description |
|--------|---------|-------------|
| `checkArrays` | `true` | Detect arrays in boolean contexts |
| `checkObjects` | `true` | Detect objects in boolean contexts |
| `checkArrayLike` | `true` | Detect Set, Map, etc. in boolean contexts |
| `strictNaming` | `false` | Use variable names to detect collections |
| `allowExplicitBoolean` | `true` | Allow `Boolean(array)` and `!!array` |

## Examples

### Basic Detection

```javascript
// ❌ Will be flagged
if ([]) { }                    // Always true
if ({}) { }                    // Always true  
if (new Set()) { }             // Always true
arr.filter(x => x) && process(); // Always true

// ✅ Auto-fixed to
if ([].length > 0) { }
if (Object.keys({}).length > 0) { }
if (new Set().size > 0) { } 
arr.filter(x => x).length > 0 && process();
```

### TypeScript Enhanced Detection

```typescript
// ❌ Enhanced detection with TypeScript
function processUsers(users: User[]) {
  if (users) {                 // 🚨 Detected via type information
    return users.filter(u => u.active);
  }
}

type Config = Record<string, any>;
const config: Config = {};
if (config) {                  // 🚨 Detected via type alias
  loadConfig(config);
}

// ✅ Proper TypeScript patterns
function processUsers(users: User[]) {
  if (users.length > 0) {      // ✅ Explicit length check
    return users.filter(u => u.active);
  }
}

function loadUserConfig(config: Config | null) {
  if (config && Object.keys(config).length > 0) {  // ✅ Null check + size check
    loadConfig(config);
  }
}
```

### Smart Suggestions

```javascript
// ❌ Suspicious pattern detected
if (new Set([item])) {         // Always has size 1!
  process();
}

// 💡 Helpful suggestions:
// 1. Check the element: if (item)
// 2. Check from element: new Set(item).size > 0  
// 3. Check size: new Set([item]).size > 0
```

### Strict Naming Mode

```javascript
// With strictNaming: true

// ❌ Will be flagged based on variable names
if (itemsArray) { }            // Naming suggests array
if (configObject) { }          // Naming suggests object
if (userList) { }              // Naming suggests array

// ✅ Better patterns
if (itemsArray.length > 0) { }
if (Object.keys(configObject).length > 0) { }
if (userList.length > 0) { }
```

## Why This Rule Matters

JavaScript's truthy behavior with collections causes subtle bugs:

```javascript
function processItems(items = []) {
  if (items) {               // 🐛 BUG: Always true!
    return items.map(x => x * 2);
  }
  return [];
}

// This fails silently:
processItems([]);            // Returns [] but we expected it to work
```

TypeScript doesn't prevent this either:

```typescript
function processItems(items: number[] = []) {
  if (items) {               // 🐛 BUG: TypeScript allows this!
    return items.map(x => x * 2);
  }
  return [];
}
```

This rule catches these issues early and suggests proper fixes.

## Rule Details

- **Type**: Problem (catches bugs)
- **Fixable**: Yes (auto-fixes available)
- **Suggestions**: Yes (multiple fix options)
- **TypeScript**: Fully supported with enhanced detection
- **Performance**: Optimized with file skipping for build directories

## Requirements

- **ESLint**: 8.0.0 or higher
- **Node.js**: 16.0.0 or higher
- **TypeScript** (optional): 4.0.0 or higher for enhanced detection
- **@typescript-eslint/parser** (optional): 6.0.0 or higher for type information

## License

MIT

## Contributing

Issues and PRs welcome! Make sure tests pass and code is formatted:

```bash
# Run tests
bun test

# Format code
bun run format

# Lint code  
bun run lint

# Format + lint in one command
bun run format:lint

# Full check (runs in CI)
bun run prepack
```