# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## metalsmith-bundled-components

This Metalsmith plugin automatically discovers, orders, and bundles CSS and JavaScript files from component-based architectures. It solves the problem of keeping component assets (styles and scripts) colocated with their templates while producing optimized, dependency-ordered output files.

## Key Commands

```bash
# Install dependencies
npm install

# Build the project (ESM and CommonJS formats)
npm run build

# Run all tests
npm run test

# Run only unit tests
npm run test:unit

# Run ESM tests only
npm run test:esm

# Run CommonJS tests only
npm run test:cjs 

# Run tests with coverage reporting
npm run coverage

# Format code with Prettier
npm run format

# Check code format without modifying
npm run format:check

# Lint code with ESLint
npm run lint

# Check for linting issues without fixing
npm run lint:check

# Prepare a release
npm run release:check

# Create a release
npm run release
```

## Code Architecture

The plugin implements a workflow that:

1. **Discovers components** in specified directories
2. **Resolves dependencies** using topological sort 
3. **Bundles assets** in dependency order
4. **Isolates JavaScript** with IIFEs to prevent global scope pollution

### Key Functions

- `collectComponents()` - Scans directories for components
- `loadComponent()` - Reads component manifests or auto-generates them
- `createComponentMap()` - Maps component names to objects
- `validateDependencies()` - Ensures all dependencies exist
- `resolveDependencyOrder()` - Implements topological sort with cycle detection
- `bundleComponents()` - Concatenates CSS and JS files with proper wrapping

### Core Algorithm: Dependency Resolution

The plugin uses depth-first search to order components based on their dependencies:

```javascript
function resolveDependencyOrder(componentMap) {
  const visited = new Set();
  const visiting = new Set();
  const order = [];

  function visit(name, path = []) {
    if (visited.has(name)) return;
    
    if (visiting.has(name)) {
      throw new Error(`Circular dependency: ${path.join(' → ')} → ${name}`);
    }
    
    visiting.add(name);
    const component = componentMap.get(name);
    
    // Visit dependencies first
    component.dependencies.forEach(dependency => {
      visit(dependency, [...path, name]);
    });
    
    visiting.delete(name);
    visited.add(name);
    order.push(name);
  }

  componentMap.forEach((_, name) => visit(name));
  return order;
}
```

## Testing Strategy

Tests are organized as:

- `test/index.js` - Main ESM tests
- `test/cjs.test.cjs` - CommonJS integration tests
- `test/unit/*.js` - Unit tests for specific functionality
- `test/fixtures/` - Test fixtures for integration testing

Key test fixtures:

1. **default** - Tests default behavior
2. **custom-paths** - Tests custom component paths
3. **dependencies** - Tests dependency ordering
4. **circular-deps** - Tests circular dependency detection

When updating tests, ensure that:

1. Changes to bundling logic include tests for ordering correctness
2. New options have corresponding test cases
3. Error cases are tested (especially circular dependency detection)

## Plugin Conventions

This plugin follows Werner Glinka's Metalsmith plugin standards:

- ESM and CommonJS dual module support
- Standard options normalization pattern
- Consistent error handling
- Debug logging support

## Release Process

1. Update version in package.json
2. Run tests and linting checks
3. Generate a changelog
4. Build the project
5. Create a new GitHub release
6. Publish to npm

The `release` script handles most of this process automatically.