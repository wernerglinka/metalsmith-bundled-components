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
 * @typedef {Object} BundledComponentsOptions
 * @property {string} [basePath] - Path to base components directory (partials)
 * @property {string} [sectionsPath] - Path to sections components directory
 * @property {string} [cssDest] - Destination path for bundled CSS
 * @property {string} [jsDest] - Destination path for bundled JS
 * @property {PostCSSConfiguration} [postcss] - PostCSS configuration
 * @property {ValidationOptions} [validation] - Validation configuration
 */

/** @type {BundledComponentsOptions} */
const defaults = {
  basePath: 'lib/layouts/components/_partials',    // Path to partials
  sectionsPath: 'lib/layouts/components/sections', // Path to sections
  cssDest: 'assets/components.css',                // Where to put it in build
  jsDest: 'assets/components.js',                  // Where to put it in build
  postcss: {
    enabled: false,
    plugins: [],
    options: {}
  },
  validation: {
    enabled: true,           // Enable validation by default
    strict: false,           // Don't fail build, just warn
    reportAllErrors: true    // Report all errors, don't stop on first
  }
};

/**
 * Normalize plugin options
 * @param {BundledComponentsOptions} [options]
 * @returns {BundledComponentsOptions}
 */
function normalizeOptions( options ) {
  const normalized = Object.assign( {}, defaults, options || {} );

  // Ensure postcss configuration has all required properties
  normalized.postcss = Object.assign( {}, defaults.postcss, normalized.postcss || {} );

  // Ensure validation configuration has all required properties
  normalized.validation = Object.assign( {}, defaults.validation, normalized.validation || {} );

  return normalized;
}

export { normalizeOptions, defaults };