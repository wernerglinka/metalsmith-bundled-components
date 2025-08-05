import postcss from 'postcss';

/**
 * @typedef {Object} PostCSSConfiguration
 * @property {Array} [plugins] - Array of PostCSS plugins
 * @property {Object} [options] - PostCSS processing options
 * @property {boolean} [enabled] - Whether PostCSS processing is enabled
 */

/**
 * Create PostCSS processor from configuration
 * @param {PostCSSConfiguration} postcssConfig - PostCSS configuration
 * @returns {Object|null} PostCSS processor or null if disabled
 */
function createPostCSSProcessor( postcssConfig ) {
  if ( !postcssConfig.enabled ) {
    return null;
  }

  const plugins = postcssConfig.plugins || [];

  return postcss( plugins );
}

/**
 * Process CSS content through PostCSS
 * @param {string} cssContent - Raw CSS content
 * @param {Object|null} processor - PostCSS processor
 * @param {string} fromPath - Source path for source maps
 * @returns {Promise<string>} Processed CSS content
 */
async function processCSSThroughPostCSS( cssContent, processor, fromPath ) {
  if ( !processor ) {
    return cssContent;
  }

  try {
    const result = await processor.process( cssContent, {
      from: fromPath,
      to: undefined // We're not writing to a specific file
    } );

    return result.css;
  } catch ( error ) {
    console.warn( `PostCSS processing failed for ${ fromPath }: ${ error.message }` );
    return cssContent; // Return original content on error
  }
}

export { createPostCSSProcessor, processCSSThroughPostCSS };