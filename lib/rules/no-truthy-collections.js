/**
 * ESLint Rule: no-truthy-collections
 *
 * Prevents dangerous boolean coercion of arrays and objects in JavaScript.
 * Enhanced to catch real-world collection variable bugs.
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
     * Check if a variable is from destructuring (should usually be allowed)
     */
    function isDestructuredVariable(node) {
      if (node.type !== 'Identifier') return false;

      // Look for destructuring patterns in parent nodes
      let current = node.parent;
      while (current) {
        if (
          current.type === 'ArrayPattern' ||
          current.type === 'ObjectPattern'
        ) {
          return true;
        }
        // Also check for rest elements in destructuring
        if (current.type === 'RestElement') {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    /**
     * Check if this looks like a proper validation pattern
     */
    function isProperValidationPattern(node) {
      const parent = node.parent;
      if (!parent) return false;

      // Pattern 1: items && items.length > 0
      if (parent.type === 'LogicalExpression' && parent.operator === '&&') {
        const right = parent.right;
        // Check if right side is a proper length/size check
        if (
          right?.type === 'BinaryExpression' &&
          (right.left?.property?.name === 'length' ||
            right.left?.property?.name === 'size') &&
          (right.operator === '>' || right.operator === '>=')
        ) {
          return true;
        }
        // Check if right side is just a length/size property access
        if (
          right?.type === 'MemberExpression' &&
          (right.property?.name === 'length' || right.property?.name === 'size')
        ) {
          return true;
        }
        // Check if right side is Object.keys(obj).length
        if (
          right?.type === 'MemberExpression' &&
          right.property?.name === 'length' &&
          right.object?.type === 'CallExpression' &&
          right.object?.callee?.type === 'MemberExpression' &&
          right.object?.callee?.object?.name === 'Object' &&
          right.object?.callee?.property?.name === 'keys'
        ) {
          return true;
        }
      }

      // Pattern 2: Optional chaining with size/length (collection?.size)
      if (
        parent.type === 'MemberExpression' &&
        parent.optional === true &&
        (parent.property?.name === 'size' || parent.property?.name === 'length')
      ) {
        return true;
      }

      // Pattern 3: Direct property access that's already a proper check
      // (items.length, config.size, etc.) - don't flag these
      if (
        parent.type === 'MemberExpression' &&
        parent.object === node &&
        (parent.property?.name === 'length' || parent.property?.name === 'size')
      ) {
        return true;
      }

      return false;
    }

    /**
     * Enhanced collection detection - much more aggressive
     */
    function analyzeNode(node) {
      if (!node) return null;

      // 1. Literal detection (highest confidence)
      if (node.type === 'ArrayExpression') {
        return { type: 'array', confidence: 100, method: 'literal' };
      }
      if (node.type === 'ObjectExpression') {
        return { type: 'object', confidence: 100, method: 'literal' };
      }

      // 2. Constructor detection
      if (node.type === 'NewExpression' || node.type === 'CallExpression') {
        const callee = node.callee;
        if (!callee) return null;

        // Array constructors
        if (callee.type === 'Identifier' && callee.name === 'Array') {
          return { type: 'array', confidence: 95, method: 'constructor' };
        }

        // Object constructors
        if (callee.type === 'Identifier' && callee.name === 'Object') {
          return { type: 'object', confidence: 95, method: 'constructor' };
        }

        // Array-like constructors - be very specific
        if (
          callee.type === 'Identifier' &&
          ['Set', 'Map', 'WeakSet', 'WeakMap'].includes(callee.name)
        ) {
          // Only flag empty constructors or suspicious patterns
          if (node.arguments.length === 0) {
            return { type: 'arraylike', confidence: 80, method: 'constructor' };
          }
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
          return null; // Don't flag normal usage
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
            return { type: 'array', confidence: 85, method: 'method' };
          }
        }

        // Array/Object static methods
        if (callee.type === 'MemberExpression') {
          if (
            callee.object?.name === 'Array' &&
            ['from', 'of'].includes(callee.property?.name)
          ) {
            return { type: 'array', confidence: 95, method: 'static' };
          }
          if (
            callee.object?.name === 'Object' &&
            [
              'create',
              'assign',
              'fromEntries',
              'keys',
              'values',
              'entries',
            ].includes(callee.property?.name)
          ) {
            return { type: 'object', confidence: 95, method: 'static' };
          }
        }
      }

      // 3. Member expressions (more selective)
      if (node.type === 'MemberExpression') {
        const property = node.property;
        if (!property || property.type !== 'Identifier') return null;

        const propName = property.name;

        // Only flag very specific, commonly problematic property names
        const problematicArrayProps = [
          'roles',
          'tags',
          'items',
          'results',
          'activities',
          'connections',
          'posts',
          'comments',
          'notifications',
          'errors',
          'warnings',
          'failures',
          'duplicates',
        ];

        const problematicObjectProps = [
          'options',
          'config',
          'settings',
          'preferences',
          'filters',
          'metadata',
          'dateRange',
          'timeRange',
        ];

        // Don't flag complex member expressions (obj.prop.subprop)
        if (node.object?.type === 'MemberExpression') {
          return null;
        }

        if (problematicArrayProps.includes(propName)) {
          return { type: 'array', confidence: 75, method: 'member-property' };
        }

        if (problematicObjectProps.includes(propName)) {
          return { type: 'object', confidence: 75, method: 'member-property' };
        }
      }

      // 4. Variable names - only when strictNaming is enabled OR exact common names
      if (node.type === 'Identifier') {
        const name = node.name;

        // Don't flag destructured variables (they're typically safe)
        if (isDestructuredVariable(node)) {
          return null;
        }

        // Very common array variable names (exact matches only for non-strict mode)
        const exactArrayNames = [
          'activities',
          'connections',
          'results',
          'items',
          'elements',
          'entries',
          'records',
          'users',
          'products',
          'files',
          'images',
          'categories',
          'widgets',
          'posts',
          'comments',
          'notifications',
          'tags',
          'roles',
          'errors',
          'warnings',
          'failures',
          'duplicates',
          'inactiveUsers',
          'userIds',
          'validatedWidgets',
          'recentPosts',
          'connectionTypes',
        ];

        // Very common object variable names (exact matches only for non-strict mode)
        const exactObjectNames = [
          'options',
          'config',
          'settings',
          'props',
          'attributes',
          'metadata',
          'preferences',
          'privacy',
          'dashboard',
          'filters',
          'updates',
          'userData',
          'userContent',
          'analytics',
          'timeRange',
          'dateRange',
          'activityGroups',
          'connectionsByType',
          'updatedPreferences',
        ];

        // Check exact matches (always enabled for very common names)
        if (exactArrayNames.includes(name)) {
          return { type: 'array', confidence: 85, method: 'variable-name' };
        }
        if (exactObjectNames.includes(name)) {
          return { type: 'object', confidence: 85, method: 'variable-name' };
        }

        // Pattern matches only when strictNaming is enabled
        if (config.strictNaming) {
          const arrayPatterns = [
            /.*[Ll]ist$/, // userList, itemsList
            /.*[Aa]rray$/, // itemsArray, dataArray
            /.*[Ii]tems$/, // menuItems, listItems
            /.*[Ee]ntries$/, // dataEntries
            /.*[Rr]ecords$/, // userRecords
            /.*[Rr]esults$/, // searchResults
            /.*[Cc]ollection$/, // dataCollection
          ];

          const objectPatterns = [
            /.*[Oo]ptions$/, // userOptions, searchOptions
            /.*[Cc]onfig$/, // appConfig, userConfig
            /.*[Ss]ettings$/, // userSettings, appSettings
            /.*[Oo]bject$/, // configObject, dataObject
            /.*[Dd]ata$/, // userData, configData (only if not exact match above)
            /.*[Ii]nfo$/, // userInfo, systemInfo
            /.*[Mm]ap$/, // settingsMap, dataMap
          ];

          // Check array patterns
          for (const pattern of arrayPatterns) {
            if (pattern.test(name)) {
              return {
                type: 'array',
                confidence: 65,
                method: 'variable-pattern',
              };
            }
          }

          // Check object patterns
          for (const pattern of objectPatterns) {
            if (pattern.test(name)) {
              return {
                type: 'object',
                confidence: 65,
                method: 'variable-pattern',
              };
            }
          }
        }
      }

      return null;
    }

    /**
     * Generate fix text with safety checks
     */
    function generateFix(node, type) {
      const text = sourceCode.getText(node);
      if (!text || text.trim() === '') return text;

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
      const { type, confidence, suspicious, element, method } = analysis;

      // Check configuration first
      if (!shouldCheck(type)) return;

      // Don't flag proper validation patterns
      if (isProperValidationPattern(node)) return;

      // Apply confidence thresholds
      let minConfidence = 60;
      if (method === 'variable-pattern') minConfidence = 65;
      if (method === 'member-property') minConfidence = 70;

      if (confidence < minConfidence) return;

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
