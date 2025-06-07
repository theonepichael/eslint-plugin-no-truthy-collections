/**
 * ESLint Rule: no-truthy-collections
 *
 * JUST ENABLE IT: 'custom/no-truthy-collections': 'error'
 *
 * Prevents dangerous boolean coercion of arrays and objects in JavaScript.
 * Arrays and objects are always truthy in JS, even when empty - this catches
 * common bugs from developers expecting Python-like falsy behavior.
 */

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent arrays and objects from being used in boolean contexts',
      category: 'Possible Errors',
      recommended: true,
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
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const options = context.options[0] || {};
    const config = {
      checkArrays: options.checkArrays !== false,
      checkObjects: options.checkObjects !== false,
      checkArrayLike: options.checkArrayLike !== false,
      allowExplicitBoolean: options.allowExplicitBoolean !== false,
      strictNaming: options.strictNaming === true,
    };

    /**
     * Check if node is in explicit boolean context like Boolean() or !!
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
     * Detect collection type and confidence
     */
    function analyzeNode(node) {
      if (!node) return null;

      // Literal detection (highest confidence)
      if (node.type === 'ArrayExpression') {
        return { type: 'array', confidence: 100 };
      }
      if (node.type === 'ObjectExpression') {
        return { type: 'object', confidence: 100 };
      }

      // Constructor detection
      if (node.type === 'NewExpression' || node.type === 'CallExpression') {
        const callee = node.callee;
        if (!callee) return null;

        // Array constructors
        if (callee.type === 'Identifier' && callee.name === 'Array') {
          return { type: 'array', confidence: 95 };
        }

        // Object constructors
        if (callee.type === 'Identifier' && callee.name === 'Object') {
          return { type: 'object', confidence: 95 };
        }

        // Array-like constructors - be very specific about when to flag
        if (
          callee.type === 'Identifier' &&
          ['Set', 'Map', 'WeakSet', 'WeakMap'].includes(callee.name)
        ) {
          // Only flag these specific cases:
          // 1. Empty constructor: new Set()
          if (node.arguments.length === 0) {
            return { type: 'arraylike', confidence: 80 };
          }
          // 2. Suspicious single array literal: new Set([x])
          if (
            node.arguments.length === 1 &&
            node.arguments[0].type === 'ArrayExpression' &&
            node.arguments[0].elements.length === 1
          ) {
            return {
              type: 'arraylike',
              confidence: 90,
              suspicious: true,
              element: node.arguments[0].elements[0],
            };
          }
          // 3. Don't flag anything else: new Set(variable), new Set([x, y]), etc.
          return null;
        }

        // Array methods that return arrays
        if (callee.type === 'MemberExpression' && callee.property?.name) {
          const arrayMethods = [
            'map',
            'filter',
            'slice',
            'concat',
            'splice',
            'flat',
            'flatMap',
          ];
          if (arrayMethods.includes(callee.property.name)) {
            return { type: 'array', confidence: 85 };
          }
        }

        // Array static methods
        if (
          callee.type === 'MemberExpression' &&
          callee.object?.name === 'Array' &&
          ['from', 'of'].includes(callee.property?.name)
        ) {
          return { type: 'array', confidence: 95 };
        }

        // Object static methods
        if (
          callee.type === 'MemberExpression' &&
          callee.object?.name === 'Object' &&
          ['create', 'assign', 'fromEntries'].includes(callee.property?.name)
        ) {
          return { type: 'object', confidence: 95 };
        }
      }

      // Naming heuristics (only if strictNaming is enabled)
      if (config.strictNaming && node.type === 'Identifier') {
        const name = node.name;

        // Array-like names - comprehensive patterns
        const arrayPatterns = [
          /[Aa]rray$/, // configArray, itemsArray
          /[Ll]ist$/, // itemsList, userList
          /[Ii]tems$/, // menuItems, listItems
          /[Ee]lements$/, // domElements, formElements
          /[Cc]ollection$/, // dataCollection, itemCollection
          /^(items|elements|list|array|collection)/i, // items, elements, etc.
        ];

        // Object-like names - comprehensive patterns including test cases
        const objectPatterns = [
          /[Oo]bject$/, // configObject ✓
          /[Cc]onfig$/, // userConfig
          /[Oo]ptions$/, // userOptions ✓
          /[Ss]ettings$/, // appSettings
          /[Pp]rops$/, // componentProps
          /[Mm]ap$/, // settingsMap ✓
          /[Aa]ttributes$/, // nodeAttributes
          /^(config|options|settings|props|attrs|data)/i, // config, options, etc.
        ];

        // Check array patterns
        for (const pattern of arrayPatterns) {
          if (pattern.test(name)) {
            return { type: 'array', confidence: 60 };
          }
        }

        // Check object patterns
        for (const pattern of objectPatterns) {
          if (pattern.test(name)) {
            return { type: 'object', confidence: 60 };
          }
        }
      }

      return null;
    }

    /**
     * Generate fix text
     */
    function generateFix(node, type) {
      const text = sourceCode.getText(node);

      // Safety check for valid text
      if (!text || text.trim() === '') {
        return text;
      }

      switch (type) {
        case 'array':
          return `${text}.length > 0`;
        case 'object':
          return `Object.keys(${text}).length > 0`;
        case 'arraylike':
          return `${text}.size > 0`;
        default:
          return `${text}.length > 0`;
      }
    }

    /**
     * Get message ID based on type and context
     */
    function getMessageId(type, isLogical = false) {
      if (isLogical) {
        return type === 'array'
          ? 'arrayInLogical'
          : type === 'object'
            ? 'objectInLogical'
            : 'arrayLikeTruthy';
      }
      return type === 'array'
        ? 'arrayTruthy'
        : type === 'object'
          ? 'objectTruthy'
          : 'arrayLikeTruthy';
    }

    /**
     * Check if we should analyze this type
     */
    function shouldCheck(type) {
      return (
        (type === 'array' && config.checkArrays) ||
        (type === 'object' && config.checkObjects) ||
        (type === 'arraylike' && config.checkArrayLike)
      );
    }

    /**
     * Report issue with suggestions
     */
    function reportIssue(node, analysis, isLogical = false) {
      const { type, confidence, suspicious, element } = analysis;

      // Check if we should analyze this type based on config
      if (!shouldCheck(type)) return;

      // Apply confidence threshold - be more lenient for naming-based detection
      if (confidence < 50) return;

      if (config.allowExplicitBoolean && isInExplicitBooleanContext(node))
        return;

      // Special handling for suspicious Set([x])/Map([x]) patterns
      if (suspicious && element) {
        const calleeName = node.callee.name;
        const elementText = sourceCode.getText(element);

        context.report({
          node,
          message: `new ${calleeName}([item]) always has size 1. Did you mean 'if ({{element}})' or 'new ${calleeName}({{element}}).size > 0'?`,
          data: { element: elementText },
          suggest: [
            {
              desc: `Check the element directly: if (${elementText})`,
              fix: fixer => fixer.replaceText(node, elementText),
            },
            {
              desc: `Create ${calleeName} from element: new ${calleeName}(${elementText}).size > 0`,
              fix: fixer =>
                fixer.replaceText(
                  node,
                  `new ${calleeName}(${elementText}).size > 0`
                ),
            },
            {
              desc: `Check size (current behavior): ${generateFix(node, type)}`,
              fix: fixer => fixer.replaceText(node, generateFix(node, type)),
            },
          ],
        });
        return;
      }

      const suggestion = generateFix(node, type);
      const messageId = getMessageId(type, isLogical);

      const suggestions = [
        {
          desc: `Safe default: Use ${suggestion} to check for items/properties`,
          fix: fixer => fixer.replaceText(node, suggestion),
        },
      ];

      // Add explicit boolean suggestion for non-arraylike
      if (type !== 'arraylike') {
        suggestions.push({
          desc: `Explicit coercion: Use Boolean(${sourceCode.getText(node)}) if you really want a boolean`,
          fix: fixer =>
            fixer.replaceText(node, `Boolean(${sourceCode.getText(node)})`),
        });
      }

      context.report({
        node,
        messageId,
        data: { suggestion },
        fix: fixer => fixer.replaceText(node, suggestion),
        suggest: suggestions,
      });
    }

    /**
     * Check node in boolean context
     */
    function checkBooleanContext(node, isLogical = false) {
      if (!node) return;

      const analysis = analyzeNode(node);
      if (analysis) {
        reportIssue(node, analysis, isLogical);
      }
    }

    return {
      // Boolean contexts
      IfStatement(node) {
        checkBooleanContext(node.test);
      },

      WhileStatement(node) {
        checkBooleanContext(node.test);
      },

      DoWhileStatement(node) {
        checkBooleanContext(node.test);
      },

      ForStatement(node) {
        if (node.test) checkBooleanContext(node.test);
      },

      ConditionalExpression(node) {
        checkBooleanContext(node.test);
      },

      LogicalExpression(node) {
        checkBooleanContext(node.left, true);
        checkBooleanContext(node.right, true);
      },

      UnaryExpression(node) {
        if (node.operator === '!') {
          checkBooleanContext(node.argument);
        }
      },
    };
  },
};
