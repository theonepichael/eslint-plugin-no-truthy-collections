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

    function isInExplicitBooleanContext(node) {
      const parent = node.parent;
      if (!parent) return false;
      if (
        parent.type === 'CallExpression' &&
        parent.callee?.type === 'Identifier' &&
        parent.callee.name === 'Boolean'
      ) {
        return true;
      }
      if (parent.type === 'UnaryExpression' && parent.operator === '!') {
        const grandParent = parent.parent;
        return (
          grandParent?.type === 'UnaryExpression' &&
          grandParent.operator === '!'
        );
      }
      return false;
    }

    function isDestructuredVariable(node) {
      if (node.type !== 'Identifier') return false;
      let current = node.parent;
      while (current) {
        if (
          current.type === 'ArrayPattern' ||
          current.type === 'ObjectPattern'
        ) {
          return true;
        }
        if (current.type === 'RestElement') {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    function isProperValidationPattern(node) {
      const parent = node.parent;
      if (!parent) return false;
      if (parent.type === 'LogicalExpression' && parent.operator === '&&') {
        const right = parent.right;
        if (
          right?.type === 'BinaryExpression' &&
          (right.left?.property?.name === 'length' ||
            right.left?.property?.name === 'size') &&
          (right.operator === '>' || right.operator === '>=')
        ) {
          return true;
        }
        if (
          right?.type === 'MemberExpression' &&
          (right.property?.name === 'length' || right.property?.name === 'size')
        ) {
          return true;
        }
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
      if (
        parent.type === 'MemberExpression' &&
        parent.optional === true &&
        (parent.property?.name === 'size' || parent.property?.name === 'length')
      ) {
        return true;
      }
      if (
        parent.type === 'MemberExpression' &&
        parent.object === node &&
        (parent.property?.name === 'length' || parent.property?.name === 'size')
      ) {
        return true;
      }
      return false;
    }

    function analyzeNode(node) {
      if (!node) return null;
      if (node.type === 'ArrayExpression') {
        return { type: 'array', confidence: 100, method: 'literal' };
      }
      if (node.type === 'ObjectExpression') {
        return { type: 'object', confidence: 100, method: 'literal' };
      }
      if (node.type === 'NewExpression' || node.type === 'CallExpression') {
        const callee = node.callee;
        if (!callee) return null;
        if (callee.type === 'Identifier' && callee.name === 'Array') {
          return { type: 'array', confidence: 95, method: 'constructor' };
        }
        if (callee.type === 'Identifier' && callee.name === 'Object') {
          return { type: 'object', confidence: 95, method: 'constructor' };
        }
        if (
          callee.type === 'Identifier' &&
          ['Set', 'Map', 'WeakSet', 'WeakMap'].includes(callee.name)
        ) {
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
          return null;
        }
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
      if (node.type === 'MemberExpression') {
        const property = node.property;
        if (!property || property.type !== 'Identifier') return null;
        const propName = property.name;
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
        if (node.object?.type === 'MemberExpression') return null;
        if (problematicArrayProps.includes(propName)) {
          return { type: 'array', confidence: 75, method: 'member-property' };
        }
        if (problematicObjectProps.includes(propName)) {
          return { type: 'object', confidence: 75, method: 'member-property' };
        }
      }
      if (node.type === 'Identifier') {
        const name = node.name;
        if (isDestructuredVariable(node)) return null;

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
          'migrationFiles',
          'pending',
          'appliedMigrations',
          'allMigrations',
          'migrations',
          'batch',
          'collections',
          'statements',
        ];

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

        if (exactArrayNames.includes(name)) {
          return { type: 'array', confidence: 85, method: 'variable-name' };
        }
        if (exactObjectNames.includes(name)) {
          return { type: 'object', confidence: 85, method: 'variable-name' };
        }

        if (config.strictNaming) {
          const arrayPatterns = [
            /.*[Ll]ist$/,
            /.*[Aa]rray$/,
            /.*[Ii]tems$/,
            /.*[Ee]ntries$/,
            /.*[Rr]ecords$/,
            /.*[Rr]esults$/,
            /.*[Cc]ollection$/,
          ];
          const objectPatterns = [
            /.*[Oo]ptions$/,
            /.*[Cc]onfig$/,
            /.*[Ss]ettings$/,
            /.*[Oo]bject$/,
            /.*[Dd]ata$/,
            /.*[Ii]nfo$/,
            /.*[Mm]ap$/,
          ];
          for (const pattern of arrayPatterns) {
            if (pattern.test(name)) {
              return {
                type: 'array',
                confidence: 65,
                method: 'variable-pattern',
              };
            }
          }
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

    function shouldCheck(type) {
      return (
        (type === 'array' && config.checkArrays) ||
        (type === 'object' && config.checkObjects) ||
        (type === 'arraylike' && config.checkArrayLike)
      );
    }

    function reportIssue(node, analysis, isLogical = false) {
      const { type, confidence, suspicious, element, method } = analysis;
      if (!shouldCheck(type)) return;
      if (isProperValidationPattern(node)) return;

      let minConfidence = 60;
      if (method === 'variable-pattern') minConfidence = 65;
      if (method === 'member-property') minConfidence = 70;
      if (confidence < minConfidence) return;

      if (config.allowExplicitBoolean && isInExplicitBooleanContext(node))
        return;

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

    function checkBooleanContext(node, isLogical = false) {
      if (!node) return;
      const analysis = analyzeNode(node);
      if (analysis) {
        reportIssue(node, analysis, isLogical);
      }
    }

    return {
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
