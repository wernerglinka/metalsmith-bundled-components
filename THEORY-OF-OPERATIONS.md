# Theory of Operations: Component Dependency Bundler

## Overview

The Component Bundler is a Metalsmith plugin that automatically discovers and bundles CSS and JavaScript files from a component-based architecture using esbuild. It solves the problem of keeping component assets (styles and scripts) colocated with their templates while producing optimized output files with modern JavaScript features like tree shaking and PostCSS integration.

## Problem Statement

In component-based web development, we want to:
- Keep CSS and JS files together with their component templates
- Avoid manual maintenance of asset import lists
- Ensure predictable loading order for namespaced components
- Prevent global scope pollution in JavaScript
- Support both simple and complex component structures
- Leverage modern bundling features like tree shaking and PostCSS

Traditional build tools often require complex configuration or manual import management. This plugin provides an automated, convention-based approach with simplified ordering.

## Architecture

### Directory Structure

The plugin expects components to be organized in a specific structure:

```
lib/
└─ layouts/
   ├─ components/
   │  ├─ _partials/          # Atomic/base components
   │  │  ├─ button/
   │  │  │  ├─ button.njk
   │  │  │  ├─ button.css
   │  │  │  ├─ button.js
   │  │  │  └─ manifest.json (optional)
   │  │  └─ image/
   │  │     ├─ image.njk
   │  │     └─ image.css
   │  └─ sections/           # Composite components
   │      ├─ banner/
   │      │   ├─ banner.njk
   │      │   ├─ banner.css
   │      │   ├─ banner.js
   │      │   └─ manifest.json
   │      └─ media/
   │          ├─ media.njk
   │          ├─ media.css
   │          └─ manifest.json
   └─ pages/
      ├─ default.njk
      └─ home.njk
```

### Component Manifest

Each component can include an optional `manifest.json` file:

```json
{
  "name": "banner",
  "type": "section",
  "description": "banner section with background image",
  "styles": ["banner.css", "banner-responsive.css"],
  "scripts": ["banner.js"],
  "requires": ["button", "image"]
}
```


### Processing Pipeline

#### 1. Template Analysis (Automatic Tree-Shaking)

The plugin analyzes page templates to detect which components are actually used:

**Detection Methods:**
1. **Frontmatter sections arrays** (primary method) - Reads `sectionType` from page metadata
2. **Layout file scanning** - Parses `{% include "..." %}` and `{% from "..." import ... %}` in layout templates
3. **Nunjucks import statements** - Parses `{% from "..." import ... %}` statements in page templates

**Example page frontmatter:**
```yaml
---
sections:
  - sectionType: hero
    text:
      title: "Welcome"
  - sectionType: banner
    background:
      image: "/hero.jpg"
---
```

From this frontmatter, the plugin detects: `["hero", "banner"]`

**Example layout file:**
```nunjucks
{% from "components/_partials/breadcrumbs/breadcrumbs.njk" import breadcrumbs %}
{% include "components/sections/header/header.njk" %}
{% include "components/sections/footer/footer.njk" %}
```

From this layout file, the plugin detects: `["breadcrumbs", "header", "footer"]`

The plugin scans both page templates AND layout files (in `lib/layouts/`) to ensure all components are detected, including those hardcoded in base layouts.

#### 2. Transitive Dependency Resolution

Once directly-used components are identified, the plugin follows dependency chains:

**Process:**
1. Start with components declared in page frontmatter
2. For each component, read its `requires` array from manifest.json
3. Recursively resolve all transitive dependencies
4. De-duplicate (using Set) to ensure each component appears once

**Example:**
- Page uses: `hero`
- `hero` requires: `["button", "image"]`
- `button` requires: `["icon"]`
- **Final bundle includes**: `hero`, `button`, `image`, `icon`

This ensures optimal bundle sizes - only components actually needed are included.

#### 3. Component Discovery

The plugin scans two directories for available components:

- `_partials/` - Atomic components (buttons, images, icons, etc.)
- `sections/` - Composite components (hero, banner, media sections, etc.)

For each subdirectory found, it:

- Looks for a manifest.json file
- Falls back to auto-discovery if no manifest exists
- Validates the component structure

**After template analysis, only needed components are processed for bundling.**

#### 4. Requirement Validation

The plugin validates that all component dependencies exist:

- Checks that all components in `requires` arrays are available
- Supports both 'requires' (new format) and 'dependencies' (legacy) properties
- Reports missing requirements as errors
- Uses simple alphabetical ordering within component groups

Since components are namespaced (CSS) and wrapped in IIFEs (JS), load order doesn't affect functionality. Alphabetical ordering provides predictable, consistent builds.

#### 5. Asset Bundling with esbuild

The plugin uses esbuild.build() with plugins for modern, optimized asset processing:

**Build Order:**
- Main CSS/JS entry points first (if specified)
- Base components that are needed (filesystem discovery order)
- Section components that are needed (filesystem discovery order)

**Note**: Only components detected via template analysis are included in the bundle.

**For CSS:**

- **Concatenates** main CSS entry + all component CSS files together
- **Copies** concatenated CSS and @import dependencies to temporary directory
- **Resolves** @import statements using esbuild bundling (preserves relative paths)
- **Applies** PostCSS transformations via esbuild-plugin-postcss  
- **Minifies** entire combined CSS output when minifyOutput is enabled
- **Outputs** single optimized CSS file to build directory
- **Cleans up** temporary files automatically

**For JavaScript:**

- Creates temporary entry file importing all JS in order
- Uses esbuild.build() with bundle: true for tree shaking
- Wraps components in IIFEs for scope isolation
- Applies tree shaking to remove unused code
- Supports minification via minifyOutput flag
- Outputs modern ES2020+ code by default

#### 4. Output Generation

The bundled assets are added to the Metalsmith files object:

- CSS typically goes to `assets/components.css`
- JavaScript typically goes to `assets/components.js`

These files are then written to the build directory by Metalsmith.

### Key Algorithms

#### Template Analysis and Tree-Shaking

The plugin uses intelligent analysis to minimize bundle sizes:

1. **Template scanning** - Parse page frontmatter for `sections` arrays with `sectionType` properties
2. **Dependency resolution** - Breadth-first traversal of `requires` arrays to find all transitive dependencies
3. **De-duplication** - Use Set data structure to ensure each component appears once
4. **Filtering** - Remove components not detected in template analysis from the bundle

**Algorithm (Breadth-First Dependency Resolution):**
```javascript
function resolveAllDependencies(usedComponents, componentMap) {
  const resolved = new Set(usedComponents);  // Start with directly-used components
  const queue = [...usedComponents];          // Queue for BFS

  while (queue.length > 0) {
    const current = queue.shift();
    const component = componentMap.get(current);
    const requires = component.requires || [];

    requires.forEach(dep => {
      if (!resolved.has(dep)) {  // Only process if not already resolved
        resolved.add(dep);        // Add to result set
        queue.push(dep);          // Add to queue for processing
      }
    });
  }

  return resolved;  // All components needed (direct + transitive)
}
```

This ensures optimal bundle sizes - a page using only "hero" won't include unused "footer", "banner", or other components.

#### Simplified Component Ordering

After filtering to needed components only, components are processed in filesystem discovery order:

1. **Main entries first** - Process main CSS/JS files if specified
2. **Base components** - Process only needed ones (in discovery order)
3. **Section components** - Process only needed ones (in discovery order)

This approach works because:
- Components are namespaced (CSS) to avoid specificity conflicts
- Components are wrapped in IIFEs (JS) for scope isolation
- Load order doesn't affect functionality
- Filesystem order provides consistent builds on the same system

#### Requirement Validation

Simple existence checking ensures all dependencies are available:

1. For each component, check its 'requires' or 'dependencies' array
2. Validate that each required component exists in the component map
3. Report missing requirements as errors

Circular dependency detection is not needed since load order doesn't affect functionality.

### Configuration Options
```javascript
{
  basePath: 'lib/layouts/components/_partials',  // Where to find base components
  sectionsPath: 'lib/layouts/components/sections', // Where to find section components
  layoutsPath: 'lib/layouts',                    // Where to find layout templates for scanning
  cssDest: 'assets/components.css',              // Output path for CSS
  jsDest: 'assets/components.js',                // Output path for JS
  mainCSSEntry: 'src/styles/main.css',           // Main CSS entry point (optional)
  mainJSEntry: 'src/scripts/main.js',            // Main JS entry point (optional)
  minifyOutput: false,                           // Enable esbuild minification
  postcss: {                                     // PostCSS via esbuild plugin
    enabled: true,
    plugins: [...],
    options: {}
  },
  validation: {                                  // Component property validation
    enabled: true,
    strict: false,
    reportAllErrors: true
  }
}
```
### Benefits

- **Automatic Tree-Shaking** - Analyzes templates to bundle only used components
- **Optimal Bundle Sizes** - Transitive dependency resolution ensures minimal output
- **Zero Configuration** - Works automatically based on page frontmatter
- **Automatic Discovery** - No need to manually maintain import lists
- **Simple Ordering** - Filesystem discovery order within component groups
- **Modern Bundling** - esbuild provides fast, optimized output with plugin support
- **CSS @import Resolution** - Automatically resolves @import statements in main CSS files
- **Complete Minification** - All CSS and JS (main + components) properly minified together
- **PostCSS Integration** - Seamless PostCSS processing via esbuild plugins
- **JavaScript Tree Shaking** - esbuild removes unused code for smaller bundles
- **Scope Isolation** - JavaScript is wrapped in IIFEs to prevent conflicts
- **Main Entry Points** - Combine application code with component bundles
- **Source Preservation** - Original files remain untouched, only build output is processed
- **Progressive Enhancement** - Works with plain CSS/JS by default
- **Clear Organization** - Components are self-contained units

### Implementation Details

#### esbuild Integration

The plugin uses `esbuild.build()` with plugins for modern asset processing:

1. **Plugin ecosystem support** - Full access to esbuild plugins like postcss
2. **Tree shaking** - Automatic dead code elimination for JavaScript
3. **Modern output** - ES2020+ syntax with optional minification
4. **PostCSS integration** - Seamless CSS processing via esbuild-plugin-postcss

#### Processing Pipeline

1. **Component discovery** - Find all components in configured directories
2. **Requirement validation** - Validate that required components exist
3. **Simple ordering** - Filesystem discovery order within base/section groups
4. **CSS processing** - Concatenate all CSS, copy to temp directory, resolve @imports and minify with esbuild.build()
5. **JS bundling** - Create temporary entry and bundle with tree shaking
6. **Output generation** - Write final bundles to Metalsmith files object

### Future Enhancements

The plugin architecture supports future additions:

- Preprocessing (SCSS, TypeScript) through esbuild loaders
- Critical CSS extraction
- Component versioning
- Build caching with esbuild's incremental builds
- Source maps generation
- Module federation support

### Error Handling
The plugin validates:

- Component manifests are valid JSON
- All required components exist (supports both 'requires' and 'dependencies')
- Referenced CSS/JS files actually exist
- Component properties match validation schemas (if enabled)

Errors are reported with clear messages to aid debugging.