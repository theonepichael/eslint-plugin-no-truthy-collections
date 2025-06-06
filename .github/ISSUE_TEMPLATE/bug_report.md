---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: 'bug'
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## Code Example

```javascript
// Code that causes the issue
if ([]) {
  console.log("This should be flagged but isn't");
}
```

## Expected Behavior

A clear description of what you expected to happen.

## Actual Behavior

A clear description of what actually happened.

## Configuration

```javascript
// Your ESLint configuration
{
  rules: {
    'no-truthy-collections/no-truthy-collections': 'error'
  }
}
```

## Environment

- ESLint version: [e.g. 8.57.0]
- Plugin version: [e.g. 1.0.0]
- Node.js version: [e.g. 20.0.0]
- TypeScript version (if applicable): [e.g. 5.0.0]
- Operating System: [e.g. Ubuntu 22.04]

## Additional Context

Add any other context about the problem here.
