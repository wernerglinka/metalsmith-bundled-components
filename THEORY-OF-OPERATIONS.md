# Theory of Operations: Component Dependency Bundler

## Overview

The Component Dependency Bundler is a Metalsmith plugin that automatically discovers, orders, and bundles CSS and JavaScript files from a component-based architecture. It solves the problem of keeping component assets (styles and scripts) colocated with their templates while producing optimized, dependency-ordered output files.

## Problem Statement

In component-based web development, we want to:
- Keep CSS and JS files together with their component templates
- Avoid manual maintenance of asset import lists
- Ensure dependencies load in the correct order
- Prevent global scope pollution in JavaScript
- Support both simple and complex component structures

Traditional build tools often require complex configuration or manual import management. This plugin provides an automated, convention-based approach.

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
  "dependencies": ["button", "image"]
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

#### 2. Dependency Resolution

Components can declare dependencies on other components. The plugin:

- Builds a dependency graph from all manifests
- Performs topological sort using depth-first search
- Detects circular dependencies and reports them as errors
- Produces a build order where dependencies always come first

Example dependency chain:
```
button (no deps) → button-group (needs button) → banner (needs button-group)
```
#### 3. Asset Bundling

Once the build order is determined, the plugin:

**For CSS:**

- Reads each component's style files in dependency order
- Adds a comment header identifying each component
- Concatenates all styles into a single file

**For JavaScript:**

- Reads each component's script files in dependency order
- Wraps each component in an IIFE to prevent global scope pollution
- Adds a comment header identifying each component
- Concatenates all scripts into a single file

#### 4. Output Generation

The bundled assets are added to the Metalsmith files object:

- CSS typically goes to `assets/components.css`
- JavaScript typically goes to `assets/components.js`

These files are then written to the build directory by Metalsmith.

### Key Algorithms
#### Topological Sort (Dependency Ordering)

The plugin uses depth-first search to order components:

1. Start with an empty `visited` set and `order` array

2. For each component:

- If already visited, skip
- Mark as "currently visiting" (for cycle detection)
- Recursively visit all dependencies
- Add to order array after dependencies
- Mark as visited

This ensures dependencies always appear before components that need them.

#### Circular Dependency Detection

During traversal, if we encounter a component marked as "currently visiting", we've found a cycle. The plugin tracks the path to provide helpful error messages:

```
Circular dependency detected: card → button → card
```

### Configuration Options
javascript
```
{
  basePath: 'lib/components/_base',        // Where to find base components
  sectionsPath: 'lib/components/sections', // Where to find section components
  cssDest: 'assets/components.css',        // Output path for CSS
  jsDest: 'assets/components.js',          // Output path for JS
}
```
### Benefits

- **Automatic Discovery** - No need to manually maintain import lists
- **Dependency Management** - Components load in the correct order
- **Scope Isolation** - JavaScript is wrapped to prevent conflicts
- **Progressive Enhancement** - Works with plain CSS/JS by default
- **Clear Organization** - Components are self-contained units

### Future Enhancements

The plugin architecture supports future additions:

Preprocessing (SCSS, TypeScript) based on file extensions
- Critical CSS extraction
- Component versioning
- Build caching
- Source maps generation

### Error Handling
The plugin validates:

- Component manifests are valid JSON
- All declared dependencies exist
- No circular dependencies
- Referenced files actually exist

Errors are reported with clear messages to aid debugging.