# CLAUDE.md

## MCP Server Integration (CRITICAL)

**IMPORTANT**: This plugin was created with `metalsmith-plugin-mcp-server`.
When working on this plugin, AI assistants (Claude) MUST use the MCP server
tools rather than improvising equivalents.

### Essential MCP Commands

```bash
list-templates                          # See what's available
get-template plugin/CLAUDE.md           # Retrieve exact template content
get-template configs/biome.json
get-template configs/release-it.json
validate .                              # Plugin validation + recommendations
diff-template .                         # Drift check vs current scaffold
configs .                               # Generate config files
show-template release-it                # Reference config templates
update-deps .                           # Dependency update
```

### CRITICAL RULES for AI Assistants

1. **Use MCP server templates verbatim** — never paraphrase or "simplify"
2. **Run `list-templates` before guessing** at template names
3. **When `validate` produces a recommendation, copy it exactly** — including
   the exact command suggested
4. **Ask the user** before modifying `.release-it.json`, `package.json`,
   `biome.json`, or any other `.json` / `.yml` / `.config.js` file
5. **Never set `npm.publish` to `true`** in `.release-it.json` — releases
   here are deliberately manual

## metalsmith-bundled-components

This Metalsmith plugin automatically discovers and bundles CSS and JavaScript files from component-based architectures. It uses esbuild.build() with plugins for modern, fast bundling with tree shaking, PostCSS integration, CSS @import resolution, complete minification, and supports bundling main application entry points alongside components.

**Node Version:** This plugin requires Node.js >= 22.0.0 (see `.nvmrc` for recommended version)

**Standards:** This plugin follows [Werner Glinka's Metalsmith Plugin Standards](../CLAUDE.md) for code quality, testing, and release processes.

## Key Commands

```bash
# Install dependencies
npm install

# Run all tests (node:test runner)
npm run test

# Run only unit tests
npm run test:unit

# Run tests with coverage (native --experimental-test-coverage)
npm run coverage

# Lint + format (Biome, one tool)
npm run lint
npm run lint:check
npm run format
npm run format:check

# Dry-run a release
npm run release:check

# Cut a release
npm run release:patch   # or :minor / :major
```

This plugin is ESM-only and ships src/ directly — no build step.

## Code Architecture

The plugin implements an intelligent workflow that optimizes bundle sizes through template analysis:

1. **Detects used components** from page frontmatter `sections` arrays
2. **Resolves transitive dependencies** via component `requires` arrays
3. **Filters components** to only bundle what's actually needed
4. **Validates requirements** ensuring all dependencies exist
5. **Orders components** in filesystem discovery order within base/section groups
6. **Processes CSS** with concatenation → temp copy → @import resolution → minification flow
7. **Bundles assets** using esbuild.build() with plugin support
8. **Isolates JavaScript** with IIFEs to prevent global scope pollution
9. **Supports main entry points** for bundling application-wide CSS/JS
10. **Resolves @import statements** automatically by copying dependencies to temp directory
11. **Applies complete minification** to all CSS and JS (main + components) in production
12. **Integrates PostCSS** via esbuild-plugin-postcss

### Automatic Tree-Shaking via Template Analysis

The plugin automatically analyzes your pages to determine which components are actually used, resulting in optimal bundle sizes:

**How it works:**

1. Scans page frontmatter for `sections` arrays containing `sectionType` declarations
2. Follows component dependency chains via `requires` arrays in manifests
3. Only bundles components that are used (directly or transitively)

**Example:**

```yaml
---
sections:
  - sectionType: hero
    text:
      title: 'Welcome'
---
```

If `hero` requires `["button", "image"]` and `button` requires `["icon"]`, the bundler automatically includes: `hero`, `button`, `image`, and `icon` - nothing more.

### Key Functions

- `detectUsedComponents()` - Analyzes templates to find components in use
- `resolveAllDependencies()` - Follows dependency chains transitively
- `filterNeededComponents()` - Removes unused components from bundle
- `collectComponents()` - Scans directories for components
- `loadComponent()` - Reads component manifests or auto-generates them
- `createComponentMap()` - Maps component names to objects
- `validateRequirements()` - Ensures all required components exist
- `bundleWithESBuild()` - Bundles CSS and JS using esbuild.build() with plugins

### Production Mode Minification

The plugin automatically minifies all CSS and JavaScript in production mode:

- CSS minification includes removing whitespace, comments, and optimizing selectors
- JavaScript minification includes removing whitespace, shortening variable names, and tree shaking
- Both main entry points and component bundles are minified
- Controlled via `metalsmith.metadata().env` or `options.env` (default: 'development')

### Core Algorithm: Simplified Component Ordering

The plugin uses a simplified approach that works because components are namespaced:

```javascript
// Simple filesystem discovery order within groups
const sortedComponents = [...baseComponents, ...sectionComponents];

// Basic requirement validation (no complex dependency resolution)
function validateRequirements(componentMap) {
  const errors = [];
  componentMap.forEach((component) => {
    const requirements = component.requires || component.dependencies || [];
    requirements.forEach((required) => {
      if (!componentMap.has(required)) {
        errors.push(`Component "${component.name}" requires "${required}" which was not found`);
      }
    });
  });
  return errors;
}
```

## Testing Strategy

Tests are organized as:

- `test/index.test.js` - Main integration tests
- `test/unit/*.test.js` - Unit tests for specific functionality
- `test/fixtures/` - Test fixtures for integration testing

Key test fixtures:

1. **default** - Tests default behavior with esbuild bundling
2. **custom-paths** - Tests custom component paths
3. **dependencies** - Tests requirement validation and ordering
4. **postcss-integration** - Tests PostCSS integration with @import resolution
5. **production-mode** - Tests minification functionality

Key test areas:

- **Integration tests** - PostCSS @import resolution, production minification
- **Unit tests** - Component discovery, options validation, requirement validation
- **Real-world scenarios** - Based on actual testbed project analysis

When updating tests, ensure that:

1. Changes to bundling logic include tests for esbuild output format
2. New options have corresponding test cases
3. Error cases are tested (especially requirement validation)
4. PostCSS integration and @import resolution tests work correctly
5. Complete minification is tested for both CSS and JS
6. Test normalization handles comment variations from esbuild processing

## Plugin Conventions

This plugin follows Werner Glinka's Metalsmith plugin standards:

- ESM-only publishing (1.0.0+); the 0.x line shipped a dual ESM/CJS build
- Standard options normalization pattern
- Consistent error handling
- Debug logging support

## CRITICAL TESTING RULES

### 1. NEVER mock Metalsmith instances

**Always use real Metalsmith instances in tests:**

```js
// ✅ CORRECT - Real Metalsmith instance
const metalsmith = Metalsmith(fixture('test-directory'));

// ❌ WRONG - Never create mock objects
const mockMetalsmith = { directory: () => '/fake/path' };
```

### 2. Use proper plugin function signature

**Plugins receive (files, metalsmith, done) - pass files directly:**

```js
// ✅ CORRECT - Proper plugin usage
function runPlugin(files, options = {}) {
  return new Promise((resolve, reject) => {
    const metalsmith = Metalsmith(fixture('validation'));
    const plugin = bundledComponents(options);

    // Plugin receives files directly - this is the standard pattern
    plugin(files, metalsmith, (error) => {
      if (error) reject(error);
      else resolve(files);
    });
  });
}

// ❌ WRONG - Don't add files to metadata
Object.keys(files).forEach((filename) => {
  metalsmith.metadata()[filename] = files[filename]; // This is wrong!
});
```

### 3. Understand files vs metadata

- **`files`** - Individual page/content files processed by the plugin
- **`metalsmith.metadata()`** - Site-wide configuration and global data
- **Don't mix them** - Files go to the plugin function, metadata is for global config

Real Metalsmith instances provide:

- Proper API methods like `metalsmith.directory()`
- Correct behavior and error handling
- Real-world testing scenarios
- Future compatibility with Metalsmith updates

## Release Process

**Before releasing**, review `README.md` to ensure options tables, examples,
defaults, and any version-specific notes still match the current code. The
release automation does not check this.

This plugin uses the automated release process with GitHub CLI integration. The process is fully automated and handles:

- Quality checks (ESLint and all tests)
- Version management (package.json and git tags)
- Changelog generation (from commit messages)
- GitHub release creation (automated via GitHub CLI)
- Git operations (pushes commits and tags)

Simply run the appropriate release command:

```bash
npm run release:patch   # Bug fixes, docs, refactoring
npm run release:minor   # New features, backwards-compatible changes
npm run release:major   # Breaking changes, major rewrites
```

For detailed release process documentation, see the [Metalsmith Plugin Standards](../CLAUDE.md#automated-release-process).
