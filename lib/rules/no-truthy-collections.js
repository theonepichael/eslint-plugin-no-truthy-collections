/**
 * ESLint Rule: no-truthy-collections
 *
 * JUST ENABLE IT: 'custom/no-truthy-collections': 'error'
 *
 * Prevents dangerous boolean coercion of arrays and objects in JavaScript.
 * Arrays and objects are always truthy in JS, even when empty - this catches
 * common bugs from developers expecting Python-like falsy behavior.
 *
 * @fileoverview Comprehensive detection with auto-fixes and TypeScript support
 */

/**
 * Check if file should be skipped (safety net for misconfiguration)
 */
function shouldSkipFile(filename) {
  if (!filename || filename === '<input>' || filename === '<text>') {
    return false; // Allow linting of dynamic/test content
  }

  const normalizedPath = filename.replace(/\\/g, '/'); // Normalize Windows paths

  // Skip common build/dependency directories
  const skipPatterns = [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.next/',
    '/.nuxt/',
    '/out/',
    '/vendor/',
    '/.git/',
    '/.cache/',
    '/tmp/',
    '/temp/',
  ];

  // Skip minified files
  if (/\.min\.(js|mjs|cjs)$/.test(normalizedPath)) {
    return true;
  }

  // Skip if path contains any skip patterns
  return skipPatterns.some(pattern => normalizedPath.includes(pattern));
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent arrays and objects from being used in boolean contexts',
      category: 'Possible Errors',
      recommended: true,
      url: 'https://github.com/your-org/eslint-rules/docs/no-truthy-collections.md',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          checkArrays: { type: 'boolean', default: true },
          checkObjects: { type: 'boolean', default: true },
          checkArrayLike: { type: 'boolean', default: true },
          allowExplicitBoolean: { type: 'boolean', default: true },
          strictNaming: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      arrayTruthy:
        "Arrays are always truthy in JavaScript, even when empty. Use '{{suggestion}}' to check for items.",
      objectTruthy:
        "Objects are always truthy in JavaScript, even when empty. Use '{{suggestion}}' to check for properties.",
      arrayLikeTruthy:
        "Array-like objects are always truthy. Use '{{suggestion}}' to check for items.",
      arrayInLogical:
        "Arrays are always truthy in logical expressions. Use '{{suggestion}}' to check for items.",
      objectInLogical:
        "Objects are always truthy in logical expressions. Use '{{suggestion}}' to check for properties.",
      explicitBooleanSuggestion:
        'Consider using Boolean({{expr}}) if intentional boolean coercion is needed.',
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const options = context.options[0] || {};
    const config = {
      checkArrays: options.checkArrays !== false, // Default: true
      checkObjects: options.checkObjects !== false, // Default: true
      checkArrayLike: options.checkArrayLike !== false, // Default: true
      allowExplicitBoolean: options.allowExplicitBoolean !== false, // Default: true
      strictNaming: options.strictNaming === true, // Default: false
    };

    // Safety net: Skip files that shouldn't be linted
    const filename = context.getFilename();
    if (filename && shouldSkipFile(filename)) {
      return {}; // Return empty visitor - skip this file entirely
    }

    // TypeScript service for type checking if available
    const parserServices = context.parserServices;
    const typeChecker = parserServices?.program?.getTypeChecker?.();
    const hasTypeInfo = typeChecker && parserServices.esTreeNodeToTSNodeMap;

    /**
     * Get TypeScript type information for a node
     */
    function getTypeInfo(node) {
      if (!hasTypeInfo) return null;

      try {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
        if (!tsNode) return null;

        const type = typeChecker.getTypeAtLocation(tsNode);
        return {
          isArray: typeChecker.isArrayType(type),
          isArrayLike: isArrayLikeType(type),
          isObject: isObjectType(type),
          symbol: type.symbol,
          flags: type.flags,
        };
      } catch {
        // Graceful degradation if TypeScript analysis fails
        return null;
      }
    }

    /**
     * Check if TypeScript type is array-like (has numeric index and length)
     */
    function isArrayLikeType(type) {
      if (!type || !typeChecker) return false;

      try {
        const lengthProperty = type.getProperty('length');
        const numberIndexInfo = typeChecker.getIndexInfoOfType(type, 1); // number index
        return !!(lengthProperty && numberIndexInfo);
      } catch {
        return false;
      }
    }

    /**
     * Check if TypeScript type is an object type (but not array/function/primitive)
     */
    function isObjectType(type) {
      if (!type || !typeChecker) return false;

      try {
        // Check if we have TypeScript available
        let ts;
        try {
          ts = require('typescript');
        } catch {
          return false; // TypeScript not available
        }

        return (
          !!(type.flags & ts.TypeFlags.Object) &&
          !typeChecker.isArrayType(type) &&
          !(type.flags & ts.TypeFlags.StringLike) &&
          !(type.getCallSignatures().length > 0)
        );
      } catch {
        return false;
      }
    }

    /**
     * Analyze node for collection types using multiple detection methods
     */
    function analyzeNode(node) {
      if (!node) return { type: 'unknown', confidence: 0 };

      // Method 1: TypeScript type information (highest confidence)
      const typeInfo = getTypeInfo(node);
      if (typeInfo) {
        if (typeInfo.isArray)
          return { type: 'array', confidence: 100, method: 'typescript' };
        if (typeInfo.isArrayLike)
          return { type: 'arraylike', confidence: 90, method: 'typescript' };
        if (typeInfo.isObject)
          return { type: 'object', confidence: 100, method: 'typescript' };
      }

      // Method 2: AST literal analysis (high confidence)
      const literalType = analyzeLiteral(node);
      if (literalType.type !== 'unknown') return literalType;

      // Method 3: Constructor/method call analysis (medium confidence)
      const constructorType = analyzeConstructor(node);
      if (constructorType.type !== 'unknown') return constructorType;

      // Method 4: Naming heuristic (lower confidence, only if strictNaming enabled)
      if (config.strictNaming && node.type === 'Identifier') {
        const namingType = analyzeNaming(node);
        if (namingType.type !== 'unknown') return namingType;
      }

      return { type: 'unknown', confidence: 0 };
    }

    /**
     * Analyze literal expressions
     */
    function analyzeLiteral(node) {
      switch (node.type) {
        case 'ArrayExpression':
          return { type: 'array', confidence: 100, method: 'literal' };
        case 'ObjectExpression':
          return { type: 'object', confidence: 100, method: 'literal' };
        default:
          return { type: 'unknown', confidence: 0 };
      }
    }

    /**
     * Analyze constructor calls and method invocations
     */
    function analyzeConstructor(node) {
      if (node.type !== 'CallExpression' && node.type !== 'NewExpression') {
        return { type: 'unknown', confidence: 0 };
      }

      const callee = node.callee;
      if (!callee) return { type: 'unknown', confidence: 0 };

      // Array constructors and static methods
      if (isArrayConstructor(callee)) {
        return { type: 'array', confidence: 95, method: 'constructor' };
      }
      // Object constructors and static methods
      if (isObjectConstructor(callee)) {
        return { type: 'object', confidence: 95, method: 'constructor' };
      }
      // Array-like constructors (Set, Map, WeakSet, WeakMap, etc.)
      if (isArrayLikeConstructor(callee)) {
        // Only flag if argument is missing or is an ArrayExpression (literal)
        if (!node.arguments.length) {
          return { type: 'arraylike', confidence: 80, method: 'constructor' };
        }
        if (node.arguments.length === 1) {
          const arg = node.arguments[0];
          if (arg.type === 'ArrayExpression') {
            return { type: 'arraylike', confidence: 80, method: 'constructor' };
          }
        }
        return { type: 'unknown', confidence: 0 };
      }
      return { type: 'unknown', confidence: 0 };
    }

    /**
     * Check if callee represents an Array constructor or method
     */
    function isArrayConstructor(callee) {
      // Direct: Array(), new Array()
      if (callee.type === 'Identifier' && callee.name === 'Array') {
        return true;
      }

      // Methods: Array.from(), Array.of()
      if (
        callee.type === 'MemberExpression' &&
        callee.object?.type === 'Identifier' &&
        callee.object.name === 'Array'
      ) {
        const methodName = callee.property?.name;
        return ['from', 'of'].includes(methodName);
      }

      // Array instance methods that return arrays
      if (callee.type === 'MemberExpression' && callee.property?.name) {
        const methodName = callee.property.name;
        const arrayMethods = [
          'map',
          'filter',
          'slice',
          'concat',
          'splice',
          'reverse',
          'sort',
          'flat',
          'flatMap',
          'toSorted',
          'toReversed',
        ];
        return arrayMethods.includes(methodName);
      }

      return false;
    }

    /**
     * Check if callee represents an Object constructor or method
     */
    function isObjectConstructor(callee) {
      // Direct: Object(), new Object()
      if (callee.type === 'Identifier' && callee.name === 'Object') {
        return true;
      }

      // Methods: Object.create(), Object.assign(), Object.fromEntries()
      if (
        callee.type === 'MemberExpression' &&
        callee.object?.type === 'Identifier' &&
        callee.object.name === 'Object'
      ) {
        const methodName = callee.property?.name;
        return ['create', 'assign', 'fromEntries'].includes(methodName);
      }

      return false;
    }

    /**
     * Check for array-like constructors (Set, Map, etc.)
     */
    function isArrayLikeConstructor(callee) {
      if (callee.type === 'Identifier') {
        const arrayLikeTypes = [
          'Set',
          'Map',
          'WeakSet',
          'WeakMap',
          'NodeList',
          'HTMLCollection',
        ];
        return arrayLikeTypes.includes(callee.name);
      }
      return false;
    }

    /**
     * Check if Set/Map constructor has suspicious single-element array pattern
     */
    function hasSuspiciousCollectionPattern(node) {
      if (node.type !== 'NewExpression' && node.type !== 'CallExpression')
        return { isSuspicious: false };

      const callee = node.callee;
      if (!callee || callee.type !== 'Identifier')
        return { isSuspicious: false };

      // Check for new Set([x]) or new Map([x]) patterns
      if (['Set', 'Map'].includes(callee.name) && node.arguments.length === 1) {
        const arg = node.arguments[0];
        // Single array argument that's not empty: new Set([x])
        if (arg.type === 'ArrayExpression' && arg.elements.length === 1) {
          return {
            isSuspicious: true,
            suggestion: `${callee.name}`,
            element: arg.elements[0],
          };
        }
      }

      return { isSuspicious: false };
    }

    /**
     * Analyze variable naming patterns (heuristic-based)
     */
    function analyzeNaming(node) {
      if (node.type !== 'Identifier') {
        return { type: 'unknown', confidence: 0 };
      }

      const name = node.name;

      // Array-like patterns
      const arrayPatterns = [
        /[Aa]rray$/,
        /[Ll]ist$/,
        /[Ii]tems$/,
        /[Ee]lements$/,
        /^(items|elements|list|array|collection)/i,
        /[Cc]ollection$/,
        /[Rr]ecords$/,
      ];

      for (const pattern of arrayPatterns) {
        if (pattern.test(name)) {
          return { type: 'array', confidence: 60, method: 'naming' };
        }
      }

      // Object-like patterns
      const objectPatterns = [
        /[Oo]bject$/,
        /[Mm]ap$/,
        /[Cc]onfig$/,
        /[Oo]ptions$/,
        /[Ss]ettings$/,
        /[Pp]rops$/,
        /[Aa]ttributes$/,
        /^(config|options|settings|props|attrs|data)/i,
      ];

      for (const pattern of objectPatterns) {
        if (pattern.test(name)) {
          return { type: 'object', confidence: 60, method: 'naming' };
        }
      }

      return { type: 'unknown', confidence: 0 };
    }

    /**
     * Generate appropriate fix suggestion based on collection type
     */
    function generateFix(node, collectionType) {
      const nodeText = sourceCode.getText(node);

      switch (collectionType) {
        case 'array':
          return `${nodeText}.length > 0`;

        case 'object':
          return `Object.keys(${nodeText}).length > 0`;

        case 'arraylike':
          return `${nodeText}.size > 0`;

        default:
          return `${nodeText}.length > 0`; // Default fallback
      }
    }

    /**
     * Check if node is in a context that allows explicit boolean coercion
     */
    function isInExplicitBooleanContext(node) {
      const parent = node.parent;
      if (!parent) return false;

      // Boolean() constructor
      if (
        parent.type === 'CallExpression' &&
        parent.callee?.type === 'Identifier' &&
        parent.callee.name === 'Boolean'
      ) {
        return true;
      }

      // !! double negation
      if (parent.type === 'UnaryExpression' && parent.operator === '!') {
        const grandParent = parent.parent;
        return (
          grandParent?.type === 'UnaryExpression' &&
          grandParent.operator === '!'
        );
      }

      return false;
    }

    /**
     * Report a problematic usage with suggestions and fixes
     */
    function reportIssue(node, analysis, messageContext = 'boolean') {
      const { type: collectionType, confidence, method } = analysis;

      // Skip if confidence is too low for naming-based detection
      if (method === 'naming' && confidence < 50) {
        return;
      }

      // Skip if explicit boolean coercion is allowed and detected
      if (config.allowExplicitBoolean && isInExplicitBooleanContext(node)) {
        return;
      }

      // Check for suspicious Set([x])/Map([x]) patterns
      const suspiciousPattern = hasSuspiciousCollectionPattern(node);
      if (suspiciousPattern && suspiciousPattern.isSuspicious) {
        context.report({
          node,
          message: `new ${suspiciousPattern.suggestion}([item]) always has size 1. Did you mean 'if ({{element}})' or 'new ${suspiciousPattern.suggestion}({{element}}).size > 0'?`,
          data: {
            element: sourceCode.getText(suspiciousPattern.element),
          },
          suggest: [
            {
              desc: `Check the element directly: if (${sourceCode.getText(suspiciousPattern.element)})`,
              fix(fixer) {
                return fixer.replaceText(
                  node,
                  sourceCode.getText(suspiciousPattern.element)
                );
              },
            },
            {
              desc: `Create ${suspiciousPattern.suggestion} from element: new ${suspiciousPattern.suggestion}(${sourceCode.getText(suspiciousPattern.element)}).size > 0`,
              fix(fixer) {
                const elementText = sourceCode.getText(
                  suspiciousPattern.element
                );
                return fixer.replaceText(
                  node,
                  `new ${suspiciousPattern.suggestion}(${elementText}).size > 0`
                );
              },
            },
            {
              desc: `Check size (current behavior): ${generateFix(node, collectionType)}`,
              fix(fixer) {
                return fixer.replaceText(
                  node,
                  generateFix(node, collectionType)
                );
              },
            },
          ],
        });
        return;
      }

      // Only report if we should check this collection type
      if (!shouldCheck(collectionType)) {
        return;
      }

      // Always report for literal, constructor, and typescript methods with high confidence
      if (
        method === 'literal' ||
        method === 'constructor' ||
        method === 'typescript' ||
        (method === 'naming' && confidence >= 50)
      ) {
        const suggestion = generateFix(node, collectionType);
        const messageId = getMessageId(collectionType, messageContext);
        const report = {
          node,
          messageId,
          data: { suggestion },
          fix(fixer) {
            return fixer.replaceText(node, suggestion);
          },
          suggest: [
            {
              desc: `Use ${suggestion} to check for items/properties`,
              fix(fixer) {
                return fixer.replaceText(node, suggestion);
              },
            },
            {
              desc: `Use Boolean(${sourceCode.getText(node)}) if explicit coercion is needed`,
              fix(fixer) {
                return fixer.replaceText(
                  node,
                  `Boolean(${sourceCode.getText(node)})`
                );
              },
            },
          ],
        };

        // For arraylike, only provide one suggestion (size > 0)
        if (collectionType === 'arraylike') {
          report.suggest = [
            {
              desc: `Use ${suggestion} to check for items`,
              fix(fixer) {
                return fixer.replaceText(node, suggestion);
              },
            },
          ];
        }

        context.report(report);
      }
    }

    /**
     * Get appropriate message ID for collection type
     */
    function getMessageId(collectionType, messageContext = 'boolean') {
      if (messageContext === 'logical') {
        switch (collectionType) {
          case 'array':
            return 'arrayInLogical';
          case 'object':
            return 'objectInLogical';
          case 'arraylike':
            return 'arrayLikeTruthy'; // No separate logical message for array-like
          default:
            return 'arrayInLogical';
        }
      }

      switch (collectionType) {
        case 'array':
          return 'arrayTruthy';
        case 'object':
          return 'objectTruthy';
        case 'arraylike':
          return 'arrayLikeTruthy';
        default:
          return 'arrayTruthy';
      }
    }

    /**
     * Check if we should analyze this collection type based on config
     */
    function shouldCheck(collectionType) {
      switch (collectionType) {
        case 'array':
          return config.checkArrays;
        case 'object':
          return config.checkObjects;
        case 'arraylike':
          return config.checkArrayLike;
        default:
          return false;
      }
    }

    /**
     * Main checker function for boolean contexts
     */
    function checkBooleanContext(node, messageContext = 'boolean') {
      if (!node) return;
      try {
        const analysis = analyzeNode(node);
        if (analysis.type !== 'unknown') {
          reportIssue(node, analysis, messageContext);
        }
      } catch (error) {
        // Graceful degradation - log but don't crash
        console.warn(
          'ESLint no-truthy-collections: Error analyzing node:',
          error.message
        );
      }
    }

    // Return visitor methods for different AST contexts
    return {
      // if (collection) / while (collection) / do-while (collection)
      IfStatement(node) {
        checkBooleanContext(node.test);
      },
      WhileStatement(node) {
        checkBooleanContext(node.test);
      },
      DoWhileStatement(node) {
        checkBooleanContext(node.test);
      },

      // collection && expr / collection || expr
      LogicalExpression(node) {
        if (node.operator === '&&' || node.operator === '||') {
          checkBooleanContext(node.left, 'logical');
          checkBooleanContext(node.right, 'logical');
        }
      },

      // collection ? a : b
      ConditionalExpression(node) {
        checkBooleanContext(node.test);
      },

      // for loops with boolean test
      ForStatement(node) {
        if (node.test) {
          checkBooleanContext(node.test);
        }
      },

      // Boolean() explicit coercion (suggest better alternative)
      CallExpression(node) {
        if (
          node.callee?.type === 'Identifier' &&
          node.callee.name === 'Boolean' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          const analysis = analyzeNode(arg);

          if (
            analysis.type !== 'unknown' &&
            analysis.confidence > 50 &&
            shouldCheck(analysis.type)
          ) {
            const suggestion = generateFix(arg, analysis.type);
            context.report({
              node: arg,
              message: `Boolean(${sourceCode.getText(arg)}) works but ${suggestion} is clearer.`,
              suggest: [
                {
                  desc: `Use ${suggestion} for explicit intent`,
                  fix(fixer) {
                    return fixer.replaceText(node, suggestion);
                  },
                },
              ],
            });
          }
        }
      },
    };
  },
};
