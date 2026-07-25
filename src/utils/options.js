/**
 * @typedef {Object} PostCSSConfiguration
 * @property {Array} [plugins] - Array of PostCSS plugins
 * @property {Object} [options] - PostCSS processing options
 * @property {boolean} [enabled] - Whether PostCSS processing is enabled
 */

/**
 * @typedef {Object} ValidationOptions
 * @property {boolean} [enabled] - Enable/disable validation
 * @property {boolean} [strict] - Fail build on validation errors (vs warnings only)
 * @property {boolean} [reportAllErrors] - Report all errors vs stop on first error
 */

/**
 * @typedef {Object} SchemaOptions
 * @property {boolean} [enabled] - Emit the composed editor schema as a build artifact
 * @property {string} [dest] - Output path for the emitted schema JSON
 */

/**
 * @typedef {Object} LayerOptions
 * @property {boolean} [enabled] - Wrap component CSS in cascade layers and pick up site overrides
 * @property {string[]} [order] - Layer precedence, lowest first, emitted as the bundle's `@layer` statement
 * @property {string} [componentsLayer] - Parent layer each component's CSS is nested under
 * @property {string} [siteLayer] - Parent layer each override file is nested under
 * @property {string} [overridesPath] - Directory holding per-component override files, relative to the project root
 */

/**
 * @typedef {Object} BundledComponentsOptions
 * @property {string} [basePath] - Path to base/partial components directory
 * @property {string} [sectionsPath] - Path to section components directory
 * @property {string} [layoutsPath] - Path to layouts directory for scanning template includes
 * @property {string} [cssDest] - Output path for bundled CSS file
 * @property {string} [jsDest] - Output path for bundled JavaScript file
 * @property {string} [mainCSSEntry] - Main CSS entry point (design tokens, base styles)
 * @property {string} [mainJSEntry] - Main JavaScript entry point (app initialization)
 * @property {boolean} [minifyOutput] - Enable esbuild minification for production
 * @property {PostCSSConfiguration} [postcss] - PostCSS configuration via esbuild plugin
 * @property {ValidationOptions} [validation] - Component property validation settings
 * @property {SchemaOptions} [schema] - Editor schema emit settings
 * @property {LayerOptions} [layers] - Cascade layer wrapping and site override pickup
 */

/** @type {BundledComponentsOptions} */
const defaults = {
  basePath: 'lib/layouts/components/_partials', // Base/partial components (buttons, cards, etc.)
  sectionsPath: 'lib/layouts/components/sections', // Section components (hero, banner, etc.)
  layoutsPath: 'lib/layouts', // Layouts directory for scanning includes
  cssDest: 'assets/main.css', // Output path for bundled CSS (main + components)
  jsDest: 'assets/main.js', // Output path for bundled JS (main + components)
  mainCSSEntry: 'lib/assets/main.css', // Main CSS entry (design tokens, base styles)
  mainJSEntry: 'lib/assets/main.js', // Main JS entry (app initialization)
  minifyOutput: false, // Enable esbuild minification
  postcss: {
    enabled: false, // PostCSS via esbuild plugin
    plugins: [], // PostCSS plugins array
    options: {} // Additional PostCSS options
  },
  validation: {
    enabled: true, // Component property validation
    strict: false, // Warn vs fail on validation errors
    reportAllErrors: true // Report all errors vs stop on first
  },
  schema: {
    enabled: false, // Off by default; opt-in so existing consumers are unaffected
    dest: 'assets/components-schema.json' // Output path for the composed editor schema
  },
  layers: {
    enabled: false, // Off by default in 1.x; enabling changes which rules win
    order: ['tokens', 'base', 'components', 'site'], // Lowest precedence first
    componentsLayer: 'components', // Component CSS lands in components.<name>
    siteLayer: 'site', // Override CSS lands in site.<name>
    overridesPath: 'lib/overrides' // Per-component overrides: <overridesPath>/<name>/<name>.css
  }
};

/**
 * Normalize and merge plugin options with defaults
 *
 * Ensures all configuration objects have required properties and applies
 * sensible defaults for the simplified esbuild-based architecture.
 *
 * @param {BundledComponentsOptions} [options] - User-provided options
 * @returns {BundledComponentsOptions} Normalized options with all defaults applied
 */
function normalizeOptions(options) {
  const normalized = { ...defaults, ...(options || {}) };

  // Ensure postcss configuration has all required properties
  normalized.postcss = { ...defaults.postcss, ...(normalized.postcss || {}) };

  // Ensure validation configuration has all required properties
  normalized.validation = { ...defaults.validation, ...(normalized.validation || {}) };

  // Ensure schema configuration has all required properties
  normalized.schema = { ...defaults.schema, ...(normalized.schema || {}) };

  // Ensure layer configuration has all required properties
  normalized.layers = { ...defaults.layers, ...(normalized.layers || {}) };

  return normalized;
}

export { defaults, normalizeOptions };
