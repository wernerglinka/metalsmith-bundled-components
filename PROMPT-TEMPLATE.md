# Metalsmith Plugin Development Prompt Template

This template provides a structured format for prompting the development of new Metalsmith plugins that adhere to established standards and best practices.

## Basic Plugin Prompt Template

```
I need to create a new Metalsmith plugin called "metalsmith-[plugin-name]" that [brief description of functionality]. The plugin should follow modern Node.js practices and my established code standards.

## Requirements

The plugin should:
- [Detailed description of what the plugin should do]
- [Any specific behaviors or edge cases to handle]
- [Performance considerations]

## Code Standards

Follow these standards exactly:
- Dual module support (ESM & CommonJS)
- Compatible with Node.js 18+
- Comprehensive test coverage (>90%)
- Strict linting with ESLint 9.x
- Include proper debug logging using metalsmith.debug
- Full documentation in README.md with standardized sections
- Thorough JSDoc comments for type information (to aid IDE tooling)
- Basic type definitions via JSDoc (no need for full TypeScript implementation)

## Plugin Architecture

Structure the plugin using:
- Two-phase plugin pattern (factory function returning processor function)
- Proper options validation and normalization
- Clear error handling
- Efficient file filtering

## Code Implementation Details

Key implementation patterns:
- Use arrow functions for the inner plugin function
- Validate options before processing
- Use `done()` directly for synchronous plugins; use `setImmediate(done)` only for async operations
- Access metalsmith.debug for logging
- Use Object.defineProperty for setting function names
- Use native Node.js modules when possible (path, fs, etc.)
- Handle both nested and direct file metadata properties

## Testing Approach

Tests should:
- Use Node's native test methods (assert)
- Test both ESM and CommonJS imports
- Use real Metalsmith instances (no mocking)
- Include tests for edge cases and error handling
- Verify the actual file outputs match expected outputs

## File Generation

Please create the following files:
1. src/index.js - Main plugin code
2. test/index.js - ESM tests
3. test/cjs.test.cjs - CommonJS tests
4. README.md - Documentation following my standard format
5. package.json - With all required fields and dependencies
6. eslint.config.js - ESLint configuration
7. prettier.config.js - Prettier configuration

Follow the examples shown in my existing plugins like metalsmith-safe-links and metalsmith-blog-lists.
```

## Advanced Plugin Development Sections

For more complex plugins, expand the prompt with these additional sections:

### Advanced Code Structure

```
The plugin should follow this code structure:
- An outer function that accepts options and returns the plugin function
- Option normalization with proper defaults
- File filtering based on file patterns or characteristics
- A clear processing pipeline for each selected file
- Proper error handling with descriptive messages
```

### Performance Optimization

```
For performance optimization:
- Filter files before expensive operations
- Use Set/Map for quicker lookups
- Pre-compile RegExp patterns outside the file loop
- Use direct property access instead of deep property lookups when possible
- Cache computed values that are reused
- Process files in batches if handling large datasets
```

### Option Validation Examples

```
Include thorough option validation like:
- Required options with clear error messages
- Type checking for options
- Format validation (e.g., for paths, patterns, etc.)
- Providing reasonable defaults
- Handling deprecated options
- Warning about unused or unknown options
```

### Advanced Testing Requirements

```
Include these advanced testing scenarios:
- Boundary tests (empty files array, minimum/maximum values)
- Performance tests for larger file sets
- Mocking external dependencies if applicable
- Testing error cases to ensure graceful failure
- Testing with various configuration combinations
- Verifying debug output
```

### Integration with Other Plugins

```
Ensure the plugin works well with these common Metalsmith plugins:
- metalsmith-layouts
- metalsmith-markdown
- metalsmith-collections
- [Other relevant plugins]

Design the plugin to respect metadata added by other plugins and avoid conflicts or overwriting important data.
```

### Versioning and Release Strategy

```
Follow semantic versioning (semver) principles:
- MAJOR version for incompatible API changes
- MINOR version for added functionality in a backward compatible manner
- PATCH version for backward compatible bug fixes

For breaking changes:
- Document migration paths in CHANGELOG.md and README.md
- When possible, provide backward compatibility options
- Consider deprecation warnings before removing features
```

### CI/CD Configuration

```
Include GitHub Actions workflows for:
- Running tests on pull requests and pushes to main
- Updating the coverage badge in README.md
- Automating version management via release-it
- Publishing to npm (optional - can be manual for better control)

The provided workflow will handle running tests, calculating coverage, and updating badges.
```

### User-Oriented Examples

```
Add comprehensive examples in the README.md that show:
- Basic usage with default options
- Common customization scenarios
- Integration with a typical Metalsmith build pipeline
- Real-world examples solving specific problems

Example:
```javascript
import Metalsmith from 'metalsmith';
import markdown from '@metalsmith/markdown';
import layouts from '@metalsmith/layouts';
import myPlugin from 'metalsmith-my-plugin';

Metalsmith(__dirname)
  .metadata({
    site: {
      title: 'My Site',
      url: 'https://example.com'
    }
  })
  .source('./src')
  .destination('./build')
  .clean(true)
  .use(markdown())
  .use(myPlugin({
    // Plugin options here
    option1: 'value1',
    option2: true
  }))
  .use(layouts())
  .build(function(err) {
    if (err) throw err;
    console.log('Build complete!');
  });
```
```

## Example Implementations to Reference

### JSDoc Type Definitions for IDE Support

```javascript
/**
 * Plugin options
 * @typedef {Object} Options
 * @property {String} key - Description of the key property
 * @property {Boolean} [optionalFlag=false] - An optional flag with default value
 * @property {('option1'|'option2'|'option3')} [enumOption='option1'] - Option with enumerated values
 * @property {Function} [callback] - Optional callback function
 */

/** @type {Options} */
const defaults = {
  key: 'defaultValue',
  optionalFlag: false,
  enumOption: 'option1'
  // callback is undefined by default
};

/**
 * Normalize plugin options
 * @param {Options} [options] - User provided options
 * @returns {Options} Normalized options with defaults applied
 */
function normalizeOptions(options) {
  return Object.assign({}, defaults, options || {});
}

/**
 * @typedef {Object} FileData
 * @property {String} contents - File contents as Buffer
 * @property {Object} [metadata] - File metadata
 */

/**
 * Main plugin function 
 * @param {Options} options - Plugin options
 * @returns {import('metalsmith').Plugin} Metalsmith plugin function
 */
function myPlugin(options = {}) {
  // Plugin implementation
}
```

Refer to these plugin patterns for guidance:

### Basic File Processing Pattern

```javascript
// Two-phase plugin pattern
const plugin = (options = {}) => {
  // Normalize options
  const opts = { 
    defaultOption: 'default',
    ...options
  };

  // Return the actual plugin function
  const metalsmithPlugin = (files, metalsmith, done) => {
    const debug = metalsmith.debug ? metalsmith.debug('metalsmith-plugin-name') : () => {};
    debug('Processing with options: %O', opts);

    // Process files
    Object.keys(files).forEach((file) => {
      // File filtering logic
      if (!file.endsWith('.html')) return;
      
      // File processing logic
      const data = files[file];
      // Modify data or contents
      
      debug(`Processed file: ${file}`);
    });

    // Done callback - use setImmediate for async operations
    // For synchronous operations like this, you can call done() directly
    // For async operations use: setImmediate(done);
    done();
  };

  // Set function name for debugging
  Object.defineProperty(metalsmithPlugin, 'name', { value: 'metalsmithPluginName' });
  return metalsmithPlugin;
};

export default plugin;
```

### Metadata Collection Pattern

```javascript
// Pattern for plugins that collect and add metadata
const plugin = (options = {}) => {
  // Options normalization
  const opts = { 
    metadataKey: 'collected',
    ...options
  };

  return (files, metalsmith, done) => {
    const debug = metalsmith.debug('metalsmith-metadata-plugin');
    
    // Create collection
    const collection = [];
    
    // Process files
    Object.keys(files).forEach((file) => {
      // Collection logic
      collection.push({
        path: file,
        // Other properties
      });
    });
    
    // Add to metadata
    const metadata = metalsmith.metadata();
    metadata[opts.metadataKey] = collection;
    metalsmith.metadata(metadata);
    
    done();
  };
};

export default plugin;
```

## Common Pitfalls to Avoid

1. **Forgetting to handle edge cases**:
   - Empty files array
   - Missing or malformed options
   - Invalid file contents

2. **Poor error handling**:
   - Not providing descriptive error messages
   - Not catching exceptions in async operations
   - Using callback incorrectly (not using `setImmediate(done)` for async operations or incorrectly using it for sync operations)

3. **Performance issues**:
   - Processing all files when filtering could be done first
   - Not caching RegExp patterns or computed values
   - Using synchronous I/O operations when async is better

4. **Test coverage gaps**:
   - Not testing option validation
   - Not testing error cases
   - Not testing with real Metalsmith instances
   - Not verifying actual vs. expected output

5. **Documentation deficiencies**:
   - Unclear option descriptions
   - Missing examples
   - No troubleshooting section
   - Inadequate JSDoc comments

6. **Security vulnerabilities**:
   - Not sanitizing user input
   - Using potentially unsafe operations (like eval, exec)
   - Not handling file paths securely
   - Exposing sensitive information in debug logs

7. **Accessibility issues (for content-generating plugins)**:
   - Not preserving or adding proper semantic HTML structure
   - Removing accessibility attributes
   - Not maintaining heading hierarchy
   - Generating inaccessible content structures

## Implementation Strategy

When creating new plugins:

1. **Start with a template**: Use the [Core Plugin](https://github.com/metalsmith/core-plugin) or [Metalsmith Plugin Template](https://github.com/wernerglinka/metalsmith-plugin-template) or use existing plugins as a starting point.

2. **Extract core patterns**: The two-phase pattern (factory function returning processor) and standardized debug/error handling approach.

3. **Prioritize testing**: Aim for 90%+ test coverage, focusing on edge cases and error scenarios.

4. **Use consistent naming**: Follow established option validation, debug namespace patterns, and function naming conventions.

5. **Document thoroughly**: Include comprehensive JSDoc comments and follow README standards.

6. **Package configuration**: Maintain the same package.json structure with dual module support.