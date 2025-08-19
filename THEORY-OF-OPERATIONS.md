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

#### 1. Component Discovery
The plugin scans two directories:

- `_partials/` - For atomic components (buttons, images, etc.)
- `sections/` - For composite components (banner, media sections, etc.)

For each subdirectory found, it:

- Looks for a manifest.json file
- Falls back to auto-discovery if no manifest exists
- Validates the component structure

#### 2. Requirement Validation

Components can declare requirements for other components. The plugin:

- Validates that all required components exist
- Supports both 'requires' (new format) and 'dependencies' (legacy) properties
- Reports missing requirements as errors
- Uses simple alphabetical ordering within component groups

Since components are namespaced to avoid specificity conflicts, complex dependency ordering is not needed. The important thing is that general CSS (design tokens, base styles) loads first via the main entry point.
#### 3. Asset Bundling with esbuild

The plugin uses esbuild.build() with plugins for modern, optimized asset processing:

**Build Order:**
- Main CSS/JS entry points first (if specified)
- Base components (alphabetical order)
- Section components (alphabetical order)

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
#### Simplified Component Ordering

The plugin uses a simplified ordering approach:

1. **Main entries first** - Process main CSS/JS files if specified
2. **Base components** - Sort alphabetically and process 
3. **Section components** - Sort alphabetically and process

This approach works because:
- Components are namespaced to avoid CSS specificity conflicts
- General styles (design tokens) load via main entry points
- Alphabetical ordering within groups provides predictable results

#### Requirement Validation

Simple existence checking replaces complex dependency resolution:

1. For each component, check its 'requires' or 'dependencies' array
2. Validate that each required component exists in the component map
3. Report missing requirements as errors

No circular dependency detection is needed since we don't enforce loading order based on requirements.

### Configuration Options
```javascript
{
  basePath: 'lib/layouts/components/_partials',  // Where to find base components
  sectionsPath: 'lib/layouts/components/sections', // Where to find section components
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

- **Automatic Discovery** - No need to manually maintain import lists
- **Predictable Ordering** - Simple, alphabetical ordering within component groups
- **Modern Bundling** - esbuild provides fast, optimized output with plugin support
- **CSS @import Resolution** - Automatically resolves @import statements in main CSS files
- **Complete Minification** - All CSS and JS (main + components) properly minified together
- **PostCSS Integration** - Seamless PostCSS processing via esbuild plugins
- **Tree Shaking** - Removes unused code for smaller bundles
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
3. **Simple ordering** - Alphabetical sorting within base/section groups
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

Errors are reported with clear messages to aid debugging. Complex circular dependency detection was removed in favor of simpler requirement validation.