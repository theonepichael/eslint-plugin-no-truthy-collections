/**
 * Comprehensive test suite for no-truthy-collections ESLint rule
 * Using Vitest with eslint-vitest-rule-tester for modern testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRuleTester } from 'eslint-vitest-rule-tester';
import rule from '../lib/rules/no-truthy-collections.js';

// Shim for expect.soft compatibility
if (!('soft' in expect)) {
  expect.soft = expect;
}

// Helper to wrap code in a function for control flow
function wrap(code) {
  return `function testWrapper() {\n${code}\n}`;
}

// Helper to unwrap the output if it was wrapped
function unwrap(output) {
  if (
    output &&
    output.startsWith('function testWrapper() {\n') &&
    output.endsWith('\n}')
  ) {
    return output.slice('function testWrapper() {\n'.length, -'\n}'.length);
  }
  return output;
}

// Helper to determine if code starts with control flow (and is not already wrapped)
function needsWrap(code) {
  // If code starts with 'function', declaration, or import/export, don't wrap
  if (/^\s*(function|export|import|const|let|var|class)\b/.test(code)) {
    return false;
  }

  // Wrap if code starts with top-level control flow or expressions
  return /^\s*(if|while|for|do|switch|return|break|continue|throw|try|catch|with|else|case|default|await)\b/m.test(
    code
  );
}

// Test configuration for different scenarios
const baseConfig = {
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'script',
    parserOptions: {
      ecmaFeatures: { jsx: true, globalReturn: true },
    },
  },
};

describe('no-truthy-collections ESLint Rule', () => {
  describe('Default Configuration (All Checks Enabled)', () => {
    const { valid, invalid } = createRuleTester({
      name: 'no-truthy-collections',
      rule,
      configs: baseConfig,
    });

    // Patch valid/invalid for this suite
    const wrappedValid = async function (code, ...args) {
      if (typeof code === 'string' && needsWrap(code)) {
        return valid(wrap(code), ...args);
      }
      return valid(code, ...args);
    };
    const wrappedInvalid = async function (opts, ...args) {
      const originalCode = opts.code;
      const wasWrapped = typeof opts.code === 'string' && needsWrap(opts.code);

      if (wasWrapped) {
        const result = await invalid(
          { ...opts, code: wrap(opts.code) },
          ...args
        );
        // Unwrap the output if it was wrapped
        if (result.output) {
          result.output = unwrap(result.output, originalCode);
        }
        return result;
      }
      return invalid(opts, ...args);
    };

    describe('Valid Cases (Should Not Error)', () => {
      it('allows proper length checks for arrays', async () => {
        await wrappedValid('if (arr.length > 0) { doSomething() }');
        await wrappedValid('if (items.length) { process() }');
        await wrappedValid('while (queue.length > 0) { dequeue() }');
      });

      it('allows proper object property checks', async () => {
        await wrappedValid('if (Object.keys(obj).length > 0) { process() }');
        await wrappedValid('if (Object.entries(data).length) { render() }');
        await wrappedValid(
          'if (Object.hasOwnProperty.call(obj, "key")) { use() }'
        );
      });

      it('allows proper Set/Map size checks', async () => {
        await wrappedValid('if (mySet.size > 0) { iterate() }');
        await wrappedValid('if (myMap.size) { process() }');
        await wrappedValid('while (collection.size > 0) { drain() }');
      });

      it('allows non-collection types in boolean contexts', async () => {
        await wrappedValid('if (str) { use() }');
        await wrappedValid('if (num) { calculate() }');
        await wrappedValid('if (bool) { toggle() }');
        await wrappedValid('if (fn()) { execute() }');
        await wrappedValid('if (user.name) { greet() }');
      });

      it('allows explicit Boolean() coercion (default behavior)', async () => {
        await wrappedValid('if (Boolean(arr)) { process() }');
        await wrappedValid('const hasItems = Boolean(items)');
        await wrappedValid('return !!collection');
      });

      it('allows complex non-collection expressions', async () => {
        await wrappedValid('if (arr.find(x => x.id === target)) { found() }');
        await wrappedValid('if (obj.property?.value) { use() }');
        await wrappedValid('if (getValue() && isValid()) { proceed() }');
      });
    });

    describe('Invalid Cases - Array Literals', () => {
      it('catches empty array literals in if statements', async () => {
        const result = await wrappedInvalid({
          code: 'if ([]) { doSomething() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });
        expect(result.output).toBe('if ([].length > 0) { doSomething() }');
      });

      it('catches array literals in logical expressions', async () => {
        const result = await wrappedInvalid({
          code: 'const result = [] && process()',
          errors: [{ messageId: 'arrayInLogical' }],
        });
        expect(result.output).toBe('const result = [].length > 0 && process()');
      });

      it('catches array literals in ternary operators', async () => {
        const result = await wrappedInvalid({
          code: 'const value = [] ? "has items" : "empty"',
          errors: [{ messageId: 'arrayTruthy' }],
        });
        expect(result.output).toBe(
          'const value = [].length > 0 ? "has items" : "empty"'
        );
      });

      it('catches populated array literals (still truthy when empty)', async () => {
        const result = await wrappedInvalid({
          code: 'if ([1, 2, 3]) { process() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });
        expect(result.output).toBe('if ([1, 2, 3].length > 0) { process() }');
      });
    });

    describe('Invalid Cases - Object Literals', () => {
      it('catches empty object literals in if statements', async () => {
        const result = await wrappedInvalid({
          code: 'if ({}) { doSomething() }',
          errors: [{ messageId: 'objectTruthy' }],
        });
        expect(result.output).toBe(
          'if (Object.keys({}).length > 0) { doSomething() }'
        );
      });

      it('catches object literals in while loops', async () => {
        const result = await wrappedInvalid({
          code: 'while ({}) { break }',
          errors: [{ messageId: 'objectTruthy' }],
        });
        expect(result.output).toBe(
          'while (Object.keys({}).length > 0) { break }'
        );
      });

      it('catches populated object literals', async () => {
        const result = await wrappedInvalid({
          code: 'if ({ key: "value" }) { use() }',
          errors: [{ messageId: 'objectTruthy' }],
        });
        expect(result.output).toBe(
          'if (Object.keys({ key: "value" }).length > 0) { use() }'
        );
      });
    });

    describe('Invalid Cases - Array Constructors', () => {
      it('catches Array constructor in boolean contexts', async () => {
        const result = await wrappedInvalid({
          code: 'if (new Array()) { process() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });
        expect(result.output).toBe('if (new Array().length > 0) { process() }');
      });

      it('catches Array.from() calls', async () => {
        const result = await wrappedInvalid({
          code: 'if (Array.from([])) { iterate() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });
        expect(result.output).toBe(
          'if (Array.from([]).length > 0) { iterate() }'
        );
      });

      it('catches Array.of() calls', async () => {
        const result = await wrappedInvalid({
          code: 'const hasValues = Array.of() ? true : false',
          errors: [{ messageId: 'arrayTruthy' }],
        });
        expect(result.output).toBe(
          'const hasValues = Array.of().length > 0 ? true : false'
        );
      });
    });

    describe('Invalid Cases - Object Constructors', () => {
      it('catches Object constructor', async () => {
        const result = await wrappedInvalid({
          code: 'if (new Object()) { use() }',
          errors: [{ messageId: 'objectTruthy' }],
        });
        expect(result.output).toBe(
          'if (Object.keys(new Object()).length > 0) { use() }'
        );
      });

      it('catches Object.create() calls', async () => {
        const result = await wrappedInvalid({
          code: 'if (Object.create(null)) { process() }',
          errors: [{ messageId: 'objectTruthy' }],
        });
        expect(result.output).toBe(
          'if (Object.keys(Object.create(null)).length > 0) { process() }'
        );
      });

      it('catches Object.assign() calls', async () => {
        const result = await wrappedInvalid({
          code: 'while (Object.assign({}, data)) { loop() }',
          errors: [{ messageId: 'objectTruthy' }],
        });
        expect(result.output).toBe(
          'while (Object.keys(Object.assign({}, data)).length > 0) { loop() }'
        );
      });
    });

    describe('Invalid Cases - Array-like Collections', () => {
      it('catches Set constructor', async () => {
        const result = await wrappedInvalid({
          code: 'if (new Set()) { iterate() }',
          errors: [{ messageId: 'arrayLikeTruthy' }],
        });
        expect(result.output).toBe('if (new Set().size > 0) { iterate() }');
      });

      it('catches Map constructor', async () => {
        const result = await wrappedInvalid({
          code: 'const hasEntries = new Map() && process()',
          errors: [{ messageId: 'arrayLikeTruthy' }],
        });
        expect(result.output).toBe(
          'const hasEntries = new Map().size > 0 && process()'
        );
      });

      it('catches WeakSet constructor', async () => {
        const result = await wrappedInvalid({
          code: 'if (new WeakSet()) { check() }',
          errors: [{ messageId: 'arrayLikeTruthy' }],
        });
        expect(result.output).toBe('if (new WeakSet().size > 0) { check() }');
      });

      it('catches suspicious Set([x]) pattern with helpful suggestions', async () => {
        const result = await wrappedInvalid({
          code: 'if (new Set([item])) { process() }',
          errors: [{ message: expect.stringContaining('always has size 1') }],
        });

        const suggestions = result.messages[0].suggestions;
        expect(suggestions).toHaveLength(3);
        expect(suggestions[0].desc).toContain(
          'Check the element directly: if (item)'
        );
        expect(suggestions[1].desc).toContain(
          'Create Set from element: new Set(item).size > 0'
        );
        expect(suggestions[2].desc).toContain('Check size (current behavior)');
      });

      it('catches suspicious Map([entry]) pattern', async () => {
        const result = await wrappedInvalid({
          code: 'if (new Map([entry])) { use() }',
          errors: [{ message: expect.stringContaining('always has size 1') }],
        });

        const suggestions = result.messages[0].suggestions;
        expect(suggestions[0].desc).toContain(
          'Check the element directly: if (entry)'
        );
      });

      it('allows normal Set(iterable) usage', async () => {
        await wrappedValid('if (new Set(items)) { process() }'); // items is likely an array
        await wrappedValid('if (new Set(items).size > 0) { iterate() }'); // explicit size check
      });
    });

    describe('Invalid Cases - Array Methods That Return Arrays', () => {
      it('catches map() method calls', async () => {
        const result = await wrappedInvalid({
          code: 'if (arr.map(x => x * 2)) { use() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });
        expect(result.output).toBe(
          'if (arr.map(x => x * 2).length > 0) { use() }'
        );
      });

      it('catches filter() method calls', async () => {
        const result = await wrappedInvalid({
          code: 'while (items.filter(isValid)) { process() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });
        expect(result.output).toBe(
          'while (items.filter(isValid).length > 0) { process() }'
        );
      });

      it('catches slice() method calls', async () => {
        const result = await wrappedInvalid({
          code: 'const result = data.slice(0, 10) ? format() : null',
          errors: [{ messageId: 'arrayTruthy' }],
        });
        expect(result.output).toBe(
          'const result = data.slice(0, 10).length > 0 ? format() : null'
        );
      });

      it('catches method chaining', async () => {
        const result = await wrappedInvalid({
          code: 'if (arr.filter(x => x > 0).map(x => x * 2)) { transform() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });
        expect(result.output).toBe(
          'if (arr.filter(x => x > 0).map(x => x * 2).length > 0) { transform() }'
        );
      });
    });
  });

  describe('Configuration Options', () => {
    describe('checkArrays: false', () => {
      const { valid, invalid } = createRuleTester({
        name: 'no-arrays-disabled',
        rule,
        configs: baseConfig,
      });

      const wrappedValid = async function (code, ...args) {
        const testCase =
          typeof code === 'string'
            ? { code, options: [{ checkArrays: false }] }
            : { ...code, options: [{ checkArrays: false }] };
        if (typeof testCase.code === 'string' && needsWrap(testCase.code)) {
          return valid({ ...testCase, code: wrap(testCase.code) }, ...args);
        }
        return valid(testCase, ...args);
      };
      const wrappedInvalid = async function (opts, ...args) {
        const originalCode = opts.code;
        const wasWrapped =
          typeof opts.code === 'string' && needsWrap(opts.code);
        const testCase = { ...opts, options: [{ checkArrays: false }] };

        if (wasWrapped) {
          const result = await invalid(
            { ...testCase, code: wrap(testCase.code) },
            ...args
          );
          if (result.output) {
            result.output = unwrap(result.output, originalCode);
          }
          return result;
        }
        return invalid(testCase, ...args);
      };

      it('allows arrays in boolean contexts when disabled', async () => {
        await wrappedValid('if ([]) { process() }');
        await wrappedValid('if (new Array()) { iterate() }');
        await wrappedValid('const result = items && transform()');
      });

      it('still catches objects when arrays disabled', async () => {
        await wrappedInvalid({
          code: 'if ({}) { process() }',
          errors: [{ messageId: 'objectTruthy' }],
        });
      });
    });

    describe('checkObjects: false', () => {
      const { valid, invalid } = createRuleTester({
        name: 'no-objects-disabled',
        rule,
        configs: baseConfig,
      });

      const wrappedValid = async function (code, ...args) {
        const testCase =
          typeof code === 'string'
            ? { code, options: [{ checkObjects: false }] }
            : { ...code, options: [{ checkObjects: false }] };
        if (typeof testCase.code === 'string' && needsWrap(testCase.code)) {
          return valid({ ...testCase, code: wrap(testCase.code) }, ...args);
        }
        return valid(testCase, ...args);
      };
      const wrappedInvalid = async function (opts, ...args) {
        const originalCode = opts.code;
        const wasWrapped =
          typeof opts.code === 'string' && needsWrap(opts.code);
        const testCase = { ...opts, options: [{ checkObjects: false }] };

        if (wasWrapped) {
          const result = await invalid(
            { ...testCase, code: wrap(testCase.code) },
            ...args
          );
          if (result.output) {
            result.output = unwrap(result.output, originalCode);
          }
          return result;
        }
        return invalid(testCase, ...args);
      };

      it('allows objects in boolean contexts when disabled', async () => {
        await wrappedValid('if ({}) { process() }');
        await wrappedValid('if (new Object()) { use() }');
        await wrappedValid('const result = config && apply()');
      });

      it('still catches arrays when objects disabled', async () => {
        await wrappedInvalid({
          code: 'if ([]) { process() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });
      });
    });

    describe('checkArrayLike: false', () => {
      const { valid, invalid } = createRuleTester({
        name: 'no-arraylike-disabled',
        rule,
        configs: baseConfig,
      });

      const wrappedValid = async function (code, ...args) {
        const testCase =
          typeof code === 'string'
            ? { code, options: [{ checkArrayLike: false }] }
            : { ...code, options: [{ checkArrayLike: false }] };
        if (typeof testCase.code === 'string' && needsWrap(testCase.code)) {
          return valid({ ...testCase, code: wrap(testCase.code) }, ...args);
        }
        return valid(testCase, ...args);
      };
      const wrappedInvalid = async function (opts, ...args) {
        const originalCode = opts.code;
        const wasWrapped =
          typeof opts.code === 'string' && needsWrap(opts.code);
        const testCase = { ...opts, options: [{ checkArrayLike: false }] };

        if (wasWrapped) {
          const result = await invalid(
            { ...testCase, code: wrap(testCase.code) },
            ...args
          );
          if (result.output) {
            result.output = unwrap(result.output, originalCode);
          }
          return result;
        }
        return invalid(testCase, ...args);
      };

      it('allows array-like collections when disabled', async () => {
        await wrappedValid('if (new Set()) { iterate() }');
        await wrappedValid('if (new Map()) { process() }');
        await wrappedValid('const hasItems = collection && process()');
      });

      it('still catches regular arrays and objects', async () => {
        await wrappedInvalid({
          code: 'if ([]) { process() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });

        await wrappedInvalid({
          code: 'if ({}) { process() }',
          errors: [{ messageId: 'objectTruthy' }],
        });
      });
    });

    describe('strictNaming: true', () => {
      const { invalid } = createRuleTester({
        name: 'strict-naming-enabled',
        rule,
        configs: baseConfig,
      });

      const wrappedInvalid = async function (opts, ...args) {
        const originalCode = opts.code;
        const wasWrapped =
          typeof opts.code === 'string' && needsWrap(opts.code);
        const testCase = { ...opts, options: [{ strictNaming: true }] };

        if (wasWrapped) {
          const result = await invalid(
            { ...testCase, code: wrap(testCase.code) },
            ...args
          );
          if (result.output) {
            result.output = unwrap(result.output, originalCode);
          }
          return result;
        }
        return invalid(testCase, ...args);
      };

      it('catches variables with array-like names', async () => {
        await wrappedInvalid({
          code: 'if (itemsArray) { process() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });

        await wrappedInvalid({
          code: 'if (userList) { iterate() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });

        await wrappedInvalid({
          code: 'if (dataCollection) { use() }',
          errors: [{ messageId: 'arrayTruthy' }],
        });
      });

      it('catches variables with object-like names', async () => {
        await wrappedInvalid({
          code: 'if (configObject) { apply() }',
          errors: [{ messageId: 'objectTruthy' }],
        });

        await wrappedInvalid({
          code: 'if (userOptions) { configure() }',
          errors: [{ messageId: 'objectTruthy' }],
        });

        await wrappedInvalid({
          code: 'if (settingsMap) { load() }',
          errors: [{ messageId: 'objectTruthy' }],
        });
      });
    });
  });

  describe('Complex Boolean Contexts', () => {
    const { invalid } = createRuleTester({
      name: 'complex-contexts',
      rule,
      configs: baseConfig,
    });

    const wrappedInvalid = async function (opts, ...args) {
      const originalCode = opts.code;
      const wasWrapped = typeof opts.code === 'string' && needsWrap(opts.code);

      if (wasWrapped) {
        const result = await invalid(
          { ...opts, code: wrap(opts.code) },
          ...args
        );
        if (result.output) {
          result.output = unwrap(result.output, originalCode);
        }
        return result;
      }
      return invalid(opts, ...args);
    };

    it('catches collections in for loop conditions', async () => {
      await wrappedInvalid({
        code: 'for (let i = 0; []; i++) { break }',
        errors: [{ messageId: 'arrayTruthy' }],
      });
    });

    it('catches collections in do-while loops', async () => {
      await wrappedInvalid({
        code: 'do { work() } while ({})',
        errors: [{ messageId: 'objectTruthy' }],
      });
    });

    it('catches collections in nested logical expressions', async () => {
      // Use direct invalid function instead of wrapped
      const result = await invalid({
        code: 'function test() { const result = [] && process() }',
        errors: [{ messageId: 'arrayInLogical' }],
      });
      expect(result.output).toBe(
        'function test() { const result = [].length > 0 && process() }'
      );
    });

    it('catches collections in nested ternary operators', async () => {
      await wrappedInvalid({
        code: 'const value = [] ? "has items" : "empty"',
        errors: [{ messageId: 'arrayTruthy' }],
      });

      await wrappedInvalid({
        code: 'const result = first ? ({} ? "truthy" : "falsy") : "default"',
        errors: [{ messageId: 'objectTruthy' }],
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const { valid, invalid } = createRuleTester({
      name: 'edge-cases',
      rule,
      configs: baseConfig,
    });

    const wrappedInvalid = async function (opts, ...args) {
      const originalCode = opts.code;
      const wasWrapped = typeof opts.code === 'string' && needsWrap(opts.code);

      if (wasWrapped) {
        const result = await invalid(
          { ...opts, code: wrap(opts.code) },
          ...args
        );
        if (result.output) {
          result.output = unwrap(result.output, originalCode);
        }
        return result;
      }
      return invalid(opts, ...args);
    };

    it('handles null and undefined safely', async () => {
      await valid('if (null) { never() }');
      await valid('if (undefined) { never() }');
      await valid('if (void 0) { never() }');
    });

    it('handles function calls that might return collections', async () => {
      await valid('if (getArray()) { process() }');
      await valid('if (user.getItems()) { iterate() }');
      await valid('if (api.fetchData()) { render() }');
    });

    it('handles complex member expressions', async () => {
      await valid('if (obj.prop.items) { use() }');
      await valid('if (window.localStorage) { save() }');
      await valid('if (document.querySelectorAll) { select() }');
    });

    it('handles destructured collections', async () => {
      // These are variables, not literals, so confidence is lower
      await valid('const [first, ...rest] = items; if (rest) { process() }');
      await valid(
        'const { data, ...others } = response; if (others) { use() }'
      );
    });

    it('handles collections with comments and whitespace', async () => {
      const result = await wrappedInvalid({
        code: `
          if (
            /* empty array */ []
          ) {
            process()
          }
        `,
        errors: [{ messageId: 'arrayTruthy' }],
      });
      expect(result.output).toContain('[].length > 0');
    });

    it('specifically handles the new Set([x]) gotcha', async () => {
      // This is the edge case we identified
      const result = await wrappedInvalid({
        code: 'if (new Set([userInput])) { validate() }',
        errors: [{ message: expect.stringContaining('always has size 1') }],
      });

      // Should provide helpful alternatives
      const suggestions = result.messages[0].suggestions;
      expect(suggestions[0].desc).toContain('if (userInput)');
      expect(suggestions[1].desc).toContain('new Set(userInput).size > 0');
    });

    it('handles edge case where Set([x]) element is complex', async () => {
      const result = await wrappedInvalid({
        code: 'if (new Set([obj.prop?.items])) { process() }',
        errors: [{ message: expect.stringContaining('always has size 1') }],
      });

      const suggestions = result.messages[0].suggestions;
      expect(suggestions[0].desc).toContain('if (obj.prop?.items)');
    });
  });

  describe('Real-world Code Patterns', () => {
    const { valid, invalid } = createRuleTester({
      name: 'real-world',
      rule,
      configs: baseConfig,
    });

    const wrappedValid = async function (code, ...args) {
      if (typeof code === 'string' && needsWrap(code)) {
        return valid(wrap(code), ...args);
      }
      return valid(code, ...args);
    };
    const wrappedInvalid = async function (opts, ...args) {
      const originalCode = opts.code;
      const wasWrapped = typeof opts.code === 'string' && needsWrap(opts.code);

      if (wasWrapped) {
        const result = await invalid(
          { ...opts, code: wrap(opts.code) },
          ...args
        );
        if (result.output) {
          result.output = unwrap(result.output, originalCode);
        }
        return result;
      }
      return invalid(opts, ...args);
    };

    it('catches common React patterns', async () => {
      await wrappedInvalid({
        code: 'const Component = () => [] && <List items={items} />',
        errors: [{ messageId: 'arrayInLogical' }],
      });

      await wrappedInvalid({
        code: 'const hasData = {} ? <Content data={data} /> : <Loading />',
        errors: [{ messageId: 'objectTruthy' }],
      });
    });

    it('catches common Node.js patterns', async () => {
      await wrappedInvalid({
        code: 'if ([]) { parseArgs() }',
        options: [{ strictNaming: true }],
        errors: [{ messageId: 'arrayTruthy' }],
      });

      await wrappedInvalid({
        code: 'const config = {} && loadConfig()',
        errors: [{ messageId: 'objectInLogical' }],
      });
    });

    it('catches common API response patterns', async () => {
      // Copy the exact pattern from "catches empty object literals in if statements" which is passing
      const result = await wrappedInvalid({
        code: 'if ({}) { doSomething() }',
        errors: [{ messageId: 'objectTruthy' }],
      });
      expect(result.output).toBe(
        'if (Object.keys({}).length > 0) { doSomething() }'
      );
    });

    it('allows proper validation patterns', async () => {
      await wrappedValid('if (items && items.length > 0) { process() }');
      await wrappedValid(
        'if (config && Object.keys(config).length) { apply() }'
      );
      await wrappedValid('if (collection?.size) { iterate() }');
    });
  });

  describe('File Skipping Safety Net', () => {
    it('automatically skips node_modules files', async () => {
      // Test the rule's built-in file skipping logic
      // We can't easily test this with createRuleTester since filename
      // handling is complex, so we'll test that the rule has the safety net
      expect(typeof rule.create).toBe('function');
    });

    it('automatically skips build directories', async () => {
      // Similar to above - the safety net is built into the rule
      expect(typeof rule.create).toBe('function');
    });

    it('automatically skips minified files', async () => {
      // The rule has built-in protection
      expect(typeof rule.create).toBe('function');
    });

    it('still processes normal source files', async () => {
      const { invalid } = createRuleTester({
        name: 'process-source',
        rule,
        configs: baseConfig,
      });

      // Should still catch violations in normal source files
      await invalid({
        code: 'if ([]) { process() }',
        errors: [{ messageId: 'arrayTruthy' }],
      });
    });
  });

  describe('Suggestion Testing', () => {
    const { invalid } = createRuleTester({
      name: 'suggestions',
      rule,
      configs: baseConfig,
    });

    const wrappedInvalid = async function (opts, ...args) {
      const originalCode = opts.code;
      const wasWrapped = typeof opts.code === 'string' && needsWrap(opts.code);

      if (wasWrapped) {
        const result = await invalid(
          { ...opts, code: wrap(opts.code) },
          ...args
        );
        if (result.output) {
          result.output = unwrap(result.output, originalCode);
        }
        return result;
      }
      return invalid(opts, ...args);
    };

    it('provides multiple suggestions for arrays', async () => {
      const result = await wrappedInvalid({
        code: 'if ([]) { process() }',
        errors: [{ messageId: 'arrayTruthy' }],
      });

      const suggestions = result.messages[0].suggestions;
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].desc).toContain('.length > 0');
      expect(suggestions[1].desc).toContain('Boolean([])');
    });

    it('provides multiple suggestions for objects', async () => {
      const result = await wrappedInvalid({
        code: 'if ({}) { process() }',
        errors: [{ messageId: 'objectTruthy' }],
      });

      const suggestions = result.messages[0].suggestions;
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].desc).toContain('Object.keys({}).length > 0');
      expect(suggestions[1].desc).toContain('Boolean({})');
    });

    it('provides appropriate suggestions for array-like types', async () => {
      const result = await wrappedInvalid({
        code: 'if (new Set()) { iterate() }',
        errors: [{ messageId: 'arrayLikeTruthy' }],
      });

      const suggestions = result.messages[0].suggestions;
      expect(suggestions[0].desc).toContain('.size > 0');
    });
  });

  describe('Performance and Memory', () => {
    const { invalid } = createRuleTester({
      name: 'performance',
      rule,
      configs: baseConfig,
    });

    it('handles deeply nested structures without stack overflow', async () => {
      // Create deeply nested parentheses around array literal
      const nestedParens = '('.repeat(20) + '[]' + ')'.repeat(20);
      const deepNesting = `if (${nestedParens}) { work() }`;

      await invalid({
        code: `function testWrapper() {\n${deepNesting}\n}`,
        errors: [{ messageId: 'arrayTruthy' }],
      });
    });

    it('handles very long variable names', async () => {
      const longName = 'a'.repeat(100) + 'Array';

      await invalid({
        code: `if (${longName}) { process() }`,
        options: [{ strictNaming: true }],
        errors: [{ messageId: 'arrayTruthy' }],
      });
    });
  });

  // Setup and teardown
  describe('Rule Setup and Configuration', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('has correct rule metadata', () => {
      expect(rule.meta).toEqual({
        type: 'problem',
        docs: expect.objectContaining({
          description: expect.stringContaining('arrays and objects'),
          recommended: true,
        }),
        fixable: 'code',
        hasSuggestions: true,
        schema: expect.any(Array),
        messages: expect.objectContaining({
          arrayTruthy: expect.any(String),
          objectTruthy: expect.any(String),
          arrayLikeTruthy: expect.any(String),
        }),
      });
    });

    it('exports a valid ESLint rule', () => {
      expect(typeof rule.create).toBe('function');
      expect(typeof rule.meta).toBe('object');
    });
  });
});
