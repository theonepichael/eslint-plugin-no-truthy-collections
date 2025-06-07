# eslint-plugin-no-truthy-collections

🚀 **ESLint plugin that prevents dangerous boolean coercion of arrays and objects in JavaScript and TypeScript**

## Rules

### `no-truthy-collections`

Prevents dangerous boolean coercion of arrays and objects in JavaScript and TypeScript. Arrays and objects are always truthy in JS, even when empty - this catches common bugs from developers expecting Python-like falsy behavior.

#### ❌ Problematic Code

```javascript
// Arrays are always truthy, even when empty!
if (items) {
  // 🐛 Always true, even for []
  render(items);
}

// Objects are always truthy, even when empty!
if (config) {
  // 🐛 Always true, even for {}
  applyConfig(config);
}

// Array-like objects too!
if (new Set()) {
  // 🐛 Always true, even when empty
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

## Detection Methods

The rule uses multiple detection methods to identify collections in boolean contexts:

### 1. Literal Detection (Highest Confidence)

```javascript
if ([]) {
} // 🚨 Array literal
if ({}) {
} // 🚨 Object literal
```

### 2. Constructor Detection

```javascript
if (new Array()) {
} // 🚨 Array constructor
if (new Object()) {
} // 🚨 Object constructor
if (new Set()) {
} // 🚨 Set constructor
if (Array.from([])) {
} // 🚨 Array static methods
if (Object.assign({})) {
} // 🚨 Object static methods
```

### 3. Method Chain Detection

```javascript
if (arr.map(x => x)) {
} // 🚨 Array methods that return arrays
if (arr.filter(fn)) {
} // 🚨 Methods: map, filter, slice, etc.
```

### 4. Naming Heuristics (Optional)

When `strictNaming: true` is enabled:

```javascript
// Array-like names
if (itemsArray) {
} // 🚨 Ends with 'Array'
if (userList) {
} // 🚨 Ends with 'List'
if (dataCollection) {
} // 🚨 Ends with 'Collection'

// Object-like names
if (configObject) {
} // 🚨 Ends with 'Object'
if (userOptions) {
} // 🚨 Ends with 'Options'
if (settingsMap) {
} // 🚨 Ends with 'Map'
```

## TypeScript Support

The rule provides basic TypeScript support and works well with TypeScript projects, though it primarily relies on AST analysis rather than full type information.

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

### TypeScript Projects

```javascript
// eslint.config.js
import noTruthyCollections from 'eslint-plugin-no-truthy-collections';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
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

| Option                 | Default | Description                               |
| ---------------------- | ------- | ----------------------------------------- |
| `checkArrays`          | `true`  | Detect arrays in boolean contexts         |
| `checkObjects`         | `true`  | Detect objects in boolean contexts        |
| `checkArrayLike`       | `true`  | Detect Set, Map, etc. in boolean contexts |
| `strictNaming`         | `false` | Use variable names to detect collections  |
| `allowExplicitBoolean` | `true`  | Allow `Boolean(array)` and `!!array`      |

## Examples

### Basic Detection

```javascript
// ❌ Will be flagged
if ([]) {
} // Always true
if ({}) {
} // Always true
if (new Set()) {
} // Always true
arr.filter(x => x) && process(); // Always true

// ✅ Auto-fixed to
if ([].length > 0) {
}
if (Object.keys({}).length > 0) {
}
if (new Set().size > 0) {
}
arr.filter(x => x).length > 0 && process();
```

### Smart Set/Map Detection

```javascript
// ❌ Empty constructors flagged
if (new Set()) {
} // 🚨 Always true
if (new Map()) {
} // 🚨 Always true

// ❌ Suspicious single-element pattern
if (new Set([item])) {
} // 🚨 Always size 1!

// ✅ Normal usage allowed
if (new Set(items)) {
} // ✅ Valid - checking variable
if (new Set([x, y])) {
} // ✅ Valid - multiple elements
```

### Logical Expression Detection

```javascript
// ❌ In logical expressions
const result = [] && process(); // 🚨 Left side always truthy
const value = {} || fallback(); // 🚨 Left side always truthy

// ✅ Auto-fixed to
const result = [].length > 0 && process();
const value = Object.keys({}).length > 0 || fallback();
```

### Strict Naming Mode

```javascript
// With strictNaming: true

// ❌ Will be flagged based on variable names
if (itemsArray) {
} // Naming suggests array
if (configObject) {
} // Naming suggests object
if (userList) {
} // Naming suggests array
if (settingsMap) {
} // Naming suggests object

// ✅ Better patterns
if (itemsArray.length > 0) {
}
if (Object.keys(configObject).length > 0) {
}
if (userList.length > 0) {
}
if (Object.keys(settingsMap).length > 0) {
}
```

### Explicit Boolean Coercion (Allowed by Default)

```javascript
// ✅ These are allowed when allowExplicitBoolean: true
if (Boolean(array)) {
} // Explicit coercion
if (!!array) {
} // Double negation
const bool = Boolean(object); // Explicit boolean conversion

// ❌ These are still flagged
if (array) {
} // Implicit coercion
while (object) {} // Implicit coercion
```

## Why This Rule Matters

JavaScript's truthy behavior with collections causes subtle bugs:

```javascript
function processItems(items = []) {
  if (items) {
    // 🐛 BUG: Always true, even for empty array!
    return items.map(x => x * 2);
  }
  return [];
}

// This fails silently:
processItems([]); // Returns [] but we expected it to work
```

Common real-world scenarios:

```javascript
// ❌ React component bug
function UserList({ users = [] }) {
  return (
    <div>
      {users && <h2>Users Found</h2>} {/* Always shows! */}
      {users.map(user => (
        <User key={user.id} {...user} />
      ))}
    </div>
  );
}

// ❌ API response handling bug
function processApiResponse(response = {}) {
  if (response) {
    // Always true!
    return response.data || [];
  }
  return [];
}

// ✅ Correct patterns
function UserList({ users = [] }) {
  return (
    <div>
      {users.length > 0 && <h2>Users Found</h2>}
      {users.map(user => (
        <User key={user.id} {...user} />
      ))}
    </div>
  );
}

function processApiResponse(response = {}) {
  if (Object.keys(response).length > 0) {
    return response.data || [];
  }
  return [];
}
```

## Boolean Contexts Detected

The rule checks these boolean contexts:

- `if` statements: `if (array) { }`
- `while` loops: `while (object) { }`
- `do-while` loops: `do { } while (array)`
- `for` loops: `for (;;array;) { }`
- Ternary operators: `array ? a : b`
- Logical expressions: `array && fn()`, `object || fallback`
- Negation: `!array`

## Special Pattern Detection

### Suspicious Set/Map Patterns

```javascript
// ❌ Detected as suspicious (always size 1)
if (new Set([item])) {
}

// 💡 Suggestions provided:
// 1. Check element directly: if (item)
// 2. Create Set from element: new Set(item).size > 0
// 3. Check size: new Set([item]).size > 0
```

### Method Chaining

```javascript
// ❌ Array methods that return arrays
if (items.map(fn)) {
} // Always truthy
if (data.filter(pred)) {
} // Always truthy
if (arr.slice(0, 5)) {
} // Always truthy

// ✅ Auto-fixed to
if (items.map(fn).length > 0) {
}
if (data.filter(pred).length > 0) {
}
if (arr.slice(0, 5).length > 0) {
}
```

## Auto-fixes and Suggestions

The rule provides automatic fixes and multiple suggestions:

### Array Collections

- **Fix**: `array` → `array.length > 0`
- **Suggestion 1**: Safe check with `.length > 0`
- **Suggestion 2**: Explicit boolean with `Boolean(array)`

### Object Collections

- **Fix**: `object` → `Object.keys(object).length > 0`
- **Suggestion 1**: Safe check with `Object.keys().length > 0`
- **Suggestion 2**: Explicit boolean with `Boolean(object)`

### Array-like Collections

- **Fix**: `set` → `set.size > 0`
- **Suggestion**: Safe check with `.size > 0`

## Rule Details

- **Type**: Problem (catches bugs)
- **Fixable**: Yes (auto-fixes available)
- **Suggestions**: Yes (multiple fix options)
- **TypeScript**: Compatible with TypeScript projects
- **Performance**: Optimized with targeted AST visitors

## Requirements

- **ESLint**: 8.0.0 or higher
- **Node.js**: 16.0.0 or higher
- **TypeScript** (optional): 4.0.0 or higher
- **@typescript-eslint/parser** (optional): For TypeScript projects

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
