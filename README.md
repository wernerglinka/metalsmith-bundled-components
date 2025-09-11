# metalsmith-bundled-components

A Metalsmith plugin that automatically discovers and bundles CSS and JavaScript files from component-based architectures using esbuild

[![metalsmith:plugin][metalsmith-badge]][metalsmith-url]
[![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url]
[![coverage][coverage-badge]][coverage-url]
[![ESM/CommonJS][modules-badge]][npm-url]
[![Known Vulnerabilities](https://snyk.io/test/npm/metalsmith-bundled-components/badge.svg)](https://snyk.io/test/npm/metalsmith-bundled-components)
[![AI-assisted development](https://img.shields.io/badge/AI-assisted-blue)](https://github.com/wernerglinka/metalsmith-bundled-components/blob/main/CLAUDE.md)

> This Metalsmith plugin is under active development. The API is stable, but breaking changes may occur before reaching 1.0.0.

## Features

- **Automatic component discovery** - Scans directories for components and their assets
- **Requirement validation** - Validates that component requirements exist (no complex dependency ordering)
- **esbuild-powered bundling** - Modern, fast bundling with tree shaking and minification
- **CSS @import resolution** - Automatically resolves @import statements in main CSS files
- **Complete minification** - All CSS and JS (main + components) properly minified in production
- **Main entry points** - Bundle your main CSS/JS files alongside components
- **PostCSS integration** - PostCSS support via esbuild plugins
- **Simple, predictable ordering** - Main entries → base components → sections (alphabetical)
- **Component validation** - Validates component properties to prevent silent failures
- **Tree shaking** - Removes unused code for smaller bundles
- **Convention over configuration** - Sensible defaults with minimal required setup
- **ESM and CommonJS support**:
  - ESM: `import bundledComponents from 'metalsmith-bundled-components'`
  - CommonJS: `const bundledComponents = require('metalsmith-bundled-components')`

## Installation

```bash
npm install metalsmith-bundled-components
```

## Usage

Pass `metalsmith-bundled-components` to `metalsmith.use`:

### Basic Usage

```js
import Metalsmith from 'metalsmith';
import bundledComponents from 'metalsmith-bundled-components';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

Metalsmith(__dirname)
  .use(bundledComponents()) // default options
  .build((err) => {
    if (err) throw err;
  });
```

### With Custom Component Paths

```js
import Metalsmith from 'metalsmith';
import bundledComponents from 'metalsmith-bundled-components';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

Metalsmith(__dirname)
  .use(
    bundledComponents({
      basePath: 'components/base',
      sectionsPath: 'components/sections',
      cssDest: 'assets/bundle.css',
      jsDest: 'assets/bundle.js'
    })
  )
  .build((err) => {
    if (err) throw err;
  });
```

### With Main Entry Points (New!)

```js
import Metalsmith from 'metalsmith';
import bundledComponents from 'metalsmith-bundled-components';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

Metalsmith(__dirname)
  .use(
    bundledComponents({
      // Bundle main app files along with components
      mainCSSEntry: 'src/styles/main.css',
      mainJSEntry: 'src/scripts/main.js',
      // Component paths
      basePath: 'components/base',
      sectionsPath: 'components/sections'
    })
  )
  .build((err) => {
    if (err) throw err;
  });
```

### Real-World Example with PostCSS Processing

```js
import Metalsmith from 'metalsmith';
import bundledComponents from 'metalsmith-bundled-components';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

Metalsmith(__dirname)
  .use(
    bundledComponents({
      basePath: 'lib/layouts/components/_partials',
      sectionsPath: 'lib/layouts/components/sections',
      postcss: {
        enabled: true,
        plugins: [autoprefixer(), cssnano({ preset: 'default' })],
        options: {
          // Additional PostCSS options if needed
        }
      }
    })
  )
  .build((err) => {
    if (err) throw err;
  });
```

This configuration:

1. Uses the default component paths in the `lib/layouts` directory structure
2. Enables PostCSS processing
3. Applies autoprefixer to add vendor prefixes for better browser compatibility
4. Minifies the CSS output using cssnano with default settings

The resulting bundled CSS will be properly ordered by dependencies, prefixed for browser compatibility, and minified for production use.

### Options

| Option         | Description                                       | Type      | Default                                                   |
| -------------- | ------------------------------------------------- | --------- | --------------------------------------------------------- |
| `basePath`     | Path to base/atomic components directory          | `String`  | `'lib/layouts/components/_partials'`                      |
| `sectionsPath` | Path to section/composite components directory    | `String`  | `'lib/layouts/components/sections'`                       |
| `cssDest`      | Destination path for bundled CSS                  | `String`  | `'assets/components.css'`                                 |
| `jsDest`       | Destination path for bundled JavaScript           | `String`  | `'assets/components.js'`                                  |
| `mainCSSEntry` | Main CSS entry point (design tokens, base styles) | `String`  | `null`                                                    |
| `mainJSEntry`  | Main JS entry point (app initialization code)     | `String`  | `null`                                                    |
| `minifyOutput` | Enable esbuild minification for production builds | `Boolean` | `false`                                                   |
| `postcss`      | PostCSS configuration (enabled, plugins, options) | `Object`  | `{ enabled: false, plugins: [], options: {} }`            |
| `validation`   | Section validation configuration                  | `Object`  | `{ enabled: true, strict: false, reportAllErrors: true }` |

## Component Structure

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

If no manifest file is present, the plugin will auto-generate one based on the component name:

- It will look for `<component-name>.css` and `<component-name>.js` files
- Requirements must be explicitly defined in a manifest file if component depends on others

## Section Validation

The plugin includes validation capabilities to catch common configuration errors in your frontmatter/YAML that would otherwise result in "silent failures" - where the site builds successfully but renders incorrectly.

### Common Problems Solved

- **Type coercion issues**: `isAnimated: "false"` (string) always evaluates to `true` in templates
- **Invalid enum values**: `buttonStyle: "blue"` when CSS only supports `primary`, `secondary`, `ghost`
- **Misspelled properties**: `titleTag: "header"` instead of valid HTML heading tags

### Manifest with Validation Rules

Add a `validation` object to your component's `manifest.json`:

```json
{
  "name": "hero",
  "type": "section",
  "styles": ["hero.css"],
  "scripts": [],
  "requires": ["button", "image"],
  "validation": {
    "required": ["sectionType"],
    "properties": {
      "sectionType": {
        "type": "string",
        "const": "hero"
      },
      "isReverse": {
        "type": "boolean"
      },
      "containerFields.isAnimated": {
        "type": "boolean"
      },
      "containerFields.background.imageScreen": {
        "type": "string",
        "enum": ["light", "dark", "none"]
      },
      "text.titleTag": {
        "type": "string",
        "enum": ["h1", "h2", "h3", "h4", "h5", "h6"]
      },
      "ctas": {
        "type": "array",
        "items": {
          "properties": {
            "isButton": {
              "type": "boolean"
            },
            "buttonStyle": {
              "type": "string",
              "enum": ["primary", "secondary", "ghost", "none"]
            }
          }
        }
      }
    }
  }
}
```

### Validation Features

**Type Validation**: Ensure fields are actual booleans, strings, numbers, or arrays - not string representations.

**Enum Validation**: Restrict values to predefined options (e.g., `titleTag: ["h1", "h2", "h3"]`).

**Nested Properties**: Use dot notation for nested validation (`containerFields.isAnimated`).

**Array Items**: Validate properties within array elements.

**Helpful Error Messages**: Get error messages with file context and helpful tips.

### Error Message Example

```
❌ Section Validation Errors:

Section 0 (hero) in src/index.md:
  - containerFields.isAnimated: expected boolean, got string "false"
  - text.titleTag: "header" is invalid. Must be one of: h1, h2, h3, h4, h5, h6
  - ctas[0].buttonStyle: "blue" is invalid. Must be one of: primary, secondary, ghost, none

Tip: String "false" evaluates to true in templates. Use boolean false instead.
```

### Validation Configuration

Configure validation behavior in plugin options:

```js
Metalsmith(__dirname)
  .use(
    bundledComponents({
      validation: {
        enabled: true, // Enable/disable validation
        strict: false, // Fail build on errors vs warnings only
        reportAllErrors: true // Report all errors vs stop on first
      }
    })
  )
  .build((err) => {
    if (err) throw err;
  });
```

## Additional PostCSS Examples

### Adding Custom Media Queries Support

```js
import Metalsmith from 'metalsmith';
import bundledComponents from 'metalsmith-bundled-components';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssCustomMedia from 'postcss-custom-media';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

Metalsmith(__dirname)
  .use(
    bundledComponents({
      postcss: {
        enabled: true,
        plugins: [postcssCustomMedia(), autoprefixer(), cssnano({ preset: 'default' })]
      }
    })
  )
  .build((err) => {
    if (err) throw err;
  });
```

### Adding Nested Rules Support

```js
import Metalsmith from 'metalsmith';
import bundledComponents from 'metalsmith-bundled-components';
import postcssNested from 'postcss-nested';
import autoprefixer from 'autoprefixer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

Metalsmith(__dirname)
  .use(
    bundledComponents({
      postcss: {
        enabled: true,
        plugins: [postcssNested(), autoprefixer()]
      }
    })
  )
  .build((err) => {
    if (err) throw err;
  });
```

## CSS Processing & @import Resolution

The plugin provides CSS processing with automatic @import resolution:

### How CSS Processing Works

1. **Concatenation**: Main CSS entry + all component CSS files are combined
2. **Temp Directory Setup**: Combined CSS and @import dependencies copied to temporary directory
3. **@import Resolution**: esbuild processes the combined CSS to resolve all @import statements
4. **Minification**: When `minifyOutput: true`, all CSS (main + components) is minified together
5. **Output**: Final processed CSS written to build directory
6. **Cleanup**: Temporary files automatically cleaned up

### @import Support

Your main CSS file can use @import statements with the following supported directory structure:

```css
/* main.css */
@import './styles/_design-tokens.css';
@import './styles/_base.css';
@import './_utilities.css'; /* Files in same directory */

/* Your main application styles */
body {
  font-family: var(--font-primary);
  line-height: var(--line-height);
}
```

**Expected Directory Structure:**

```
src/assets/
├── main.css               /* Main CSS entry point */
├── _utilities.css         /* CSS files in same directory */
└── styles/                /* Subdirectory for @imports */
    ├── _design-tokens.css
    ├── _base.css
    └── _components.css
```

The plugin automatically:

- ✅ **Copies imported files** to temp directory preserving relative paths
- ✅ **Resolves @import statements** using esbuild bundling
- ✅ **Combines with component CSS** for a single output file
- ✅ **Applies minification** to the entire combined CSS when enabled

### Production Minification

When `minifyOutput: true` is set:

```js
Metalsmith(__dirname).use(
  bundledComponents({
    mainCSSEntry: 'lib/assets/main.css',
    minifyOutput: process.env.NODE_ENV === 'production' // Enable in production
  })
);
```

**Result**: All CSS (main entry + imported files + component styles) is fully minified into a single optimized file.

## Test Coverage

This plugin is tested using mocha with c8 for code coverage.

## Debug

To enable debug logs, set the `DEBUG` environment variable to `metalsmith-bundled-components*`:

```js
metalsmith.env('DEBUG', 'metalsmith-bundled-components*');
```

Alternatively, you can set `DEBUG` to `metalsmith:*` to debug all Metalsmith plugins.

## CLI Usage

To use this plugin with the Metalsmith CLI, add `metalsmith-bundled-components` to the `plugins` key in your `metalsmith.json` file:

```json
{
  "plugins": [
    {
      "metalsmith-bundled-components": {
        "basePath": "lib/layouts/components/_partials",
        "sectionsPath": "lib/layouts/components/sections",
        "postcss": {
          "enabled": true,
          "plugins": ["autoprefixer", "cssnano"]
        }
      }
    }
  ]
}
```

## License

MIT

## Development transparency

Portions of this project were developed with the assistance of AI tools including Claude and Claude Code. These tools were used to:

- Generate or refactor code
- Assist with documentation
- Troubleshoot bugs and explore alternative approaches

All AI-assisted code has been reviewed and tested to ensure it meets project standards. See the included [CLAUDE.md](CLAUDE.md) and [PROMPT-TEMPLATE.md](PROMPT-TEMPLATE.md) files for more details.

[npm-badge]: https://img.shields.io/npm/v/metalsmith-bundled-components.svg
[npm-url]: https://www.npmjs.com/package/metalsmith-bundled-components
[metalsmith-badge]: https://img.shields.io/badge/metalsmith-plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[license-badge]: https://img.shields.io/github/license/wernerglinka/metalsmith-bundled-components
[license-url]: LICENSE
[coverage-badge]: https://img.shields.io/badge/test%20coverage-94%25-brightgreen
[coverage-url]: #test-coverage
[modules-badge]: https://img.shields.io/badge/modules-ESM%2FCJS-blue
