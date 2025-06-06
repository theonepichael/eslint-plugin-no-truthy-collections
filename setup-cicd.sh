#!/bin/bash

# 🚀 ESLint Plugin CI/CD Setup Script
# Automatically generates GitHub Actions workflows, templates, and configurations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME="eslint-plugin-no-truthy-collections"
GITHUB_USERNAME="${GITHUB_USERNAME:-your-username}"
NODE_VERSIONS=(18 20 22)
DEFAULT_NODE="20"

# Print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# Create directory structure
create_directories() {
    print_status "Creating directory structure..."
    
    mkdir -p .github/workflows
    mkdir -p .github/ISSUE_TEMPLATE
    
    print_success "Directory structure created"
}

# Generate GitHub Actions workflow
generate_workflow() {
    local workflow_type="$1"
    local filename=".github/workflows/ci.yml"
    
    print_status "Generating $workflow_type CI/CD workflow..."
    
    if [[ "$workflow_type" == "full" ]]; then
        cat > "$filename" << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  release:
    types: [ published ]

jobs:
  test:
    name: Test on Node.js ${{ matrix.node-version }} (${{ matrix.os }})
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest, macos-latest]
        include:
          - node-version: 20
            os: ubuntu-latest
            package-manager: bun
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Setup Bun (if specified)
      if: matrix.package-manager == 'bun'
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
        
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: |
          node_modules
          ~/.npm
          ~/.cache
        key: ${{ runner.os }}-node-${{ matrix.node-version }}-${{ hashFiles('**/package-lock.json', '**/bun.lockb') }}
        restore-keys: |
          ${{ runner.os }}-node-${{ matrix.node-version }}-
          ${{ runner.os }}-node-
          
    - name: Install dependencies (npm)
      if: matrix.package-manager != 'bun'
      run: npm ci
      
    - name: Install dependencies (bun)
      if: matrix.package-manager == 'bun'
      run: bun install --frozen-lockfile
      
    - name: Run tests
      run: npm test
      
    - name: Run linting
      run: npm run lint
      
    - name: Check formatting
      run: npm run format:check
      
    - name: Test plugin on itself
      run: npm run test-plugin

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run security audit
      run: npm audit --audit-level=moderate

  compatibility:
    name: ESLint Compatibility Test
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        eslint-version: ["8.0.0", "8.57.0", "9.0.0"]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Test with ESLint ${{ matrix.eslint-version }}
      run: |
        npm install eslint@${{ matrix.eslint-version }}
        npm test

  publish:
    name: Publish to NPM
    runs-on: ubuntu-latest
    needs: [test, security, compatibility]
    if: github.event_name == 'release' && github.event.action == 'published'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20
        registry-url: https://registry.npmjs.org/
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run full test suite
      run: npm run prepack
      
    - name: Publish to NPM
      run: npm publish
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
EOF
    else
        cat > "$filename" << 'EOF'
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20, 22]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linting
      run: npm run lint
    
    - name: Check formatting
      run: npm run format:check
EOF
    fi
    
    print_success "Generated $workflow_type workflow: $filename"
}

# Generate Dependabot configuration
generate_dependabot() {
    print_status "Generating Dependabot configuration..."
    
    cat > .github/dependabot.yml << EOF
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "$GITHUB_USERNAME"
    assignees:
      - "$GITHUB_USERNAME"
    commit-message:
      prefix: "deps"
      prefix-development: "deps-dev"
    groups:
      eslint:
        patterns:
          - "eslint*"
          - "@typescript-eslint/*"
      testing:
        patterns:
          - "vitest"
          - "*test*"
      development:
        dependency-type: "development"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "ci"
EOF
    
    print_success "Generated Dependabot configuration"
}

# Generate issue templates
generate_issue_templates() {
    print_status "Generating GitHub issue templates..."
    
    # Bug report template
    cat > .github/ISSUE_TEMPLATE/bug_report.md << 'EOF'
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
  console.log('This should be flagged but isn\'t');
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
EOF

    # Feature request template
    cat > .github/ISSUE_TEMPLATE/feature_request.md << 'EOF'
---
name: Feature request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: 'enhancement'
assignees: ''
---

## Feature Description
A clear and concise description of what you want to happen.

## Problem Statement
What problem does this feature solve?

## Proposed Solution
```javascript
// Example of how the feature might work
{
  rules: {
    'no-truthy-collections/no-truthy-collections': ['error', {
      newOption: true  // Your proposed feature
    }]
  }
}
```

## Use Case
Describe your use case and how this feature would help.

## Additional Context
Add any other context about the feature request here.
EOF
    
    print_success "Generated issue templates"
}

# Generate pull request template
generate_pr_template() {
    print_status "Generating pull request template..."
    
    cat > .github/pull_request_template.md << 'EOF'
## Description

Brief description of the changes in this PR.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code cleanup/refactoring

## Testing

- [ ] Tests pass locally (`bun test`)
- [ ] Linting passes (`bun run lint`)
- [ ] Formatting is correct (`bun run format:check`)
- [ ] Added tests for new functionality (if applicable)

## Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of the code has been performed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Documentation has been updated (if needed)
- [ ] No new warnings or errors introduced

## Related Issues

Fixes #(issue number)
EOF
    
    print_success "Generated pull request template"
}

# Generate Node.js version files
generate_node_files() {
    print_status "Generating Node.js version files..."
    
    echo "$DEFAULT_NODE" > .nvmrc
    
    print_success "Generated .nvmrc with Node.js $DEFAULT_NODE"
}

# Update package.json scripts
update_package_json() {
    print_status "Updating package.json scripts..."
    
    if [[ -f "package.json" ]]; then
        # Backup original
        cp package.json package.json.backup
        
        # Update scripts section (this is a simplified approach)
        print_warning "package.json found - please manually verify these scripts are present:"
        echo "  \"test-plugin\": \"eslint --config eslint.config.test.js lib/\""
        echo "  \"format\": \"prettier --write .\""
        echo "  \"format:check\": \"prettier --check .\""
        echo "  \"format:lint\": \"npm run format && npm run lint:fix\""
        
        print_success "Package.json backup created (package.json.backup)"
    else
        print_warning "package.json not found - please ensure scripts are configured"
    fi
}

# Generate setup summary
generate_summary() {
    print_header "🎉 CI/CD Setup Complete!"
    echo
    print_status "Files generated:"
    echo "  📁 .github/workflows/ci.yml"
    echo "  📁 .github/dependabot.yml"
    echo "  📁 .github/ISSUE_TEMPLATE/bug_report.md"
    echo "  📁 .github/ISSUE_TEMPLATE/feature_request.md"
    echo "  📁 .github/pull_request_template.md"
    echo "  📄 .nvmrc"
    echo
    print_status "Next steps:"
    echo "  1. Update GITHUB_USERNAME in .github/dependabot.yml"
    echo "  2. Add NPM_TOKEN to GitHub repository secrets"
    echo "  3. Commit and push to trigger CI/CD"
    echo "  4. Test with: git push origin main"
    echo
    print_status "Commands to test locally:"
    echo "  npm test"
    echo "  npm run lint"
    echo "  npm run format:check"
    echo "  npm run test-plugin"
}

# Main setup function
main() {
    print_header "ESLint Plugin CI/CD Setup"
    echo
    
    # Parse command line arguments
    WORKFLOW_TYPE="simple"
    SKIP_VSCODE="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --full)
                WORKFLOW_TYPE="full"
                shift
                ;;
            --simple)
                WORKFLOW_TYPE="simple"
                shift
                ;;
            --username)
                GITHUB_USERNAME="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --full         Generate full CI/CD pipeline (default: simple)"
                echo "  --simple       Generate simple CI pipeline"
                echo "  --skip-vscode  Skip VS Code settings generation"
                echo "  --username     Set GitHub username (default: your-username)"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    print_status "Configuration:"
    echo "  Workflow type: $WORKFLOW_TYPE"
    echo "  GitHub username: $GITHUB_USERNAME"
    echo
    
    # Confirm before proceeding
    read -p "$(echo -e ${CYAN}Continue with setup? [y/N]: ${NC})" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Setup cancelled"
        exit 0
    fi
    
    # Run setup steps
    create_directories
    generate_workflow "$WORKFLOW_TYPE"
    generate_dependabot
    generate_issue_templates
    generate_pr_template
    generate_node_files
    
    update_package_json
    generate_summary
    
    print_success "Setup completed successfully! 🚀"
}

# Check if script is being executed (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi