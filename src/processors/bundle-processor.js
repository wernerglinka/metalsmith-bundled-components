import fs from 'fs';
import path from 'path';
import { processCSSThroughPostCSS } from './postcss-processor.js';

/**
 * @typedef {Object} BundledAssets
 * @property {string|null} css - Bundled CSS content or null if no CSS
 * @property {string|null} js - Bundled JavaScript content or null if no JS
 */

/**
 * Bundle components in dependency order
 * - Takes the build order (from dependency resolution)
 * - Processes each component in order
 * - Combines all CSS and all JS separately
 * - Applies PostCSS processing if configured
 * 
 * @param {Array} buildOrder - Component names in order
 * @param {Map} componentMap - Component map
 * @param {Object|null} postcssProcessor - PostCSS processor
 * @returns {Promise<Object>} Promise resolving to object with css and js properties
 */
async function bundleComponents( buildOrder, componentMap, postcssProcessor ) {
  const cssPromises = buildOrder.map( name => {
    const component = componentMap.get( name );
    return bundleComponentStyles( component, postcssProcessor );
  } );

  const cssContents = await Promise.all( cssPromises );
  const cssContent = cssContents
    .filter( content => content )
    .join( '\n\n' );

  const jsContent = buildOrder
    .map( name => bundleComponentScripts( componentMap.get( name ) ) )
    .filter( content => content )
    .join( '\n\n' );

  return {
    css: cssContent || null,
    js: jsContent || null
  };
}

/**
 * Bundle a single component's styles
 * - Reads files from disk
 * - Applies PostCSS processing if configured
 * - Adds appropriate comments/wrappers
 * - Returns formatted content or null
 * 
 * @param {Object} component - Component object
 * @param {Object|null} postcssProcessor - PostCSS processor
 * @returns {Promise<string|null>} Promise resolving to bundled CSS or null
 */
async function bundleComponentStyles( component, postcssProcessor ) {
  const stylePromises = component.styles.map( async styleFile => {
    const filePath = path.join( component.path, styleFile );

    if ( fs.existsSync( filePath ) ) {
      let content = fs.readFileSync( filePath, 'utf8' ).trim();

      if ( content ) {
        // Process through PostCSS if available
        content = await processCSSThroughPostCSS( content, postcssProcessor, filePath );
        return content;
      }
    }
    return null;
  } );

  const processedContents = await Promise.all( stylePromises );
  const validContents = processedContents.filter( content => content );

  if ( validContents.length === 0 ) {
    return null;
  }

  const parts = [ `/******* Component: ${ component.name } *******/`, ...validContents ];
  return parts.join( '\n' );
}

/**
 * Bundle a single component's scripts
 * - Reads files from disk
 * - Adds appropriate comments/wrappers
 * - Returns formatted content or null
 *
 * @param {Object} component - Component object
 * @returns {string|null} Bundled JS or null
 */
function bundleComponentScripts( component ) {
  const parts = [];

  component.scripts.forEach( scriptFile => {
    const filePath = path.join( component.path, scriptFile );
    if ( fs.existsSync( filePath ) ) {
      const content = fs.readFileSync( filePath, 'utf8' );
      parts.push( `// ****** Component: ${ component.name } ******` );
      parts.push( `(function() {` );
      parts.push( content.trim() );
      parts.push( `})();` );
    }
  } );

  return parts.length > 0 ? parts.join( '\n' ) : null;
}

export { bundleComponents, bundleComponentStyles, bundleComponentScripts };