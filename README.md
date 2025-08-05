# metalsmith-bundled-components

A Metalsmith plugin that automatically discovers, orders, and bundles CSS and JavaScript files from component-based architectures

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
- **Dependency resolution** - Automatically orders components based on their dependencies
- **Circular dependency detection** - Identifies and reports circular dependencies
- **Asset bundling** - Concatenates CSS and JS files in the correct order
- **JavaScript scope isolation** - Wraps JS in IIFEs to prevent global namespace pollution
- **PostCSS integration** - Optional processing of CSS with PostCSS plugins
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

Metalsmith(__dirname)
  .use(bundledComponents({
    basePath: 'components/base',
    sectionsPath: 'components/sections',
    cssDest: 'assets/bundle.css',
    jsDest: 'assets/bundle.js'
  }))
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

Metalsmith(__dirname)
  .use(bundledComponents({
    basePath: 'lib/layouts/components/_partials',
    sectionsPath: 'lib/layouts/components/sections',
    postcss: {
      enabled: true,
      plugins: [
        autoprefixer(),
        cssnano({ preset: 'default' })
      ],
      options: {
        // Additional PostCSS options if needed
      }
    }
  }))
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

| Option | Description | Type | Default |
|--------|-------------|------|---------|
| `basePath` | Path to base/atomic components directory | `String` | `'lib/layouts/components/_partials'` |
| `sectionsPath` | Path to section/composite components directory | `String` | `'lib/layouts/components/sections'` |
| `cssDest` | Destination path for bundled CSS | `String` | `'assets/components.css'` |
| `jsDest` | Destination path for bundled JavaScript | `String` | `'assets/components.js'` |
| `postcss` | PostCSS configuration (enabled, plugins, options) | `Object` | `{ enabled: false, plugins: [], options: {} }` |
| `validation` | Section validation configuration | `Object` | `{ enabled: true, strict: false, reportAllErrors: true }` |

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
  "dependencies": ["button", "image"]
}
```

If no manifest file is present, the plugin will auto-generate one based on the component name:
- It will look for `<component-name>.css` and `<component-name>.js` files
- Dependencies must be explicitly defined in a manifest file

## Section Validation

The plugin includes powerful validation capabilities to catch common configuration errors in your frontmatter/YAML that would otherwise result in "silent failures" - where the site builds successfully but renders incorrectly.

### Common Problems Solved

- **Type coercion issues**: `isAnimated: "false"` (string) always evaluates to `true` in templates
- **Invalid enum values**: `buttonStyle: "blue"` when CSS only supports `primary`, `secondary`, `ghost`
- **Misspelled properties**: `titleTag: "header"` instead of valid HTML heading tags

### Enhanced Manifest with Validation Rules

Add a `validation` object to your component's `manifest.json`:

```json
{
  "name": "hero",
  "type": "section",
  "styles": ["hero.css"],
  "scripts": [],
  "dependencies": ["button", "image"],
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

**Helpful Error Messages**: Get actionable error messages with file context and helpful tips.

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
  .use(bundledComponents({
    validation: {
      enabled: true,           // Enable/disable validation
      strict: false,           // Fail build on errors vs warnings only
      reportAllErrors: true    // Report all errors vs stop on first
    }
  }))
  .build((err) => {
    if (err) throw err;
  });
```

### Backward Compatibility

- Validation is **completely optional** - components without validation rules work unchanged
- Existing projects continue building without any modifications
- Add validation rules gradually as you update components
- No performance impact when validation is disabled

## Additional PostCSS Examples

### Adding Custom Media Queries Support

```js
import Metalsmith from 'metalsmith';
import bundledComponents from 'metalsmith-bundled-components';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssCustomMedia from 'postcss-custom-media';

Metalsmith(__dirname)
  .use(bundledComponents({
    postcss: {
      enabled: true,
      plugins: [
        postcssCustomMedia(),
        autoprefixer(),
        cssnano({ preset: 'default' })
      ]
    }
  }))
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

Metalsmith(__dirname)
  .use(bundledComponents({
    postcss: {
      enabled: true,
      plugins: [
        postcssNested(),
        autoprefixer()
      ]
    }
  }))
  .build((err) => {
    if (err) throw err;
  });
```

## Test Coverage

This plugin is tested using mocha with c8 for code coverage.

## Debug

To enable debug logs, set the `DEBUG` environment variable to `metalsmith-bundled-components*`:

```js
metalsmith.env('DEBUG', 'metalsmith-bundled-components*')
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

Portions of this project were developed with the assistance of AI tools including Claude and Augment Code. These tools were used to:
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
[coverage-badge]: https://img.shields.io/badge/test%20coverage-92%25-brightgreen
[coverage-url]: #test-coverage
[modules-badge]: https://img.shields.io/badge/modules-ESM%2FCJS-blue