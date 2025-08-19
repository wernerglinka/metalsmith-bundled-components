import path from 'path';
import { normalizeOptions } from './utils/options.js';
import { collectComponents, createComponentMap } from './utils/component-discovery.js';
import { validateRequirements } from './utils/requirement-validator.js';
import { bundleWithESBuild } from './processors/esbuild-processor.js';
import { validateSections } from './utils/validation.js';

/**
 * @typedef {Object} BundledAssets
 * @property {string|null} css - Bundled CSS content or null if no CSS
 * @property {string|null} js - Bundled JavaScript content or null if no JS
 */

/**
 * @typedef {import('./utils/options.js').BundledComponentsOptions} Options
 */

/**
 * Helper function to get component manifest for validation
 * @param {Map} componentMap - Map of component names to component objects
 * @param {string} sectionType - The section type to look up
 * @returns {Object} Component manifest object
 * @throws {Error} If component is not found
 */
function getManifest( componentMap, sectionType ) {
  const component = componentMap.get( sectionType );
  if ( !component ) {
    throw new Error( `Component "${ sectionType }" not found` );
  }
  return component;
}

/**
 * A Metalsmith plugin that automatically discovers and bundles CSS and JavaScript files 
 * from component-based architectures using esbuild. All component styles and scripts are
 * merged into the main CSS and JS files, creating a single bundle for each asset type.
 * Processing order: main entries → base components → section components.
 * Includes PostCSS support via esbuild plugins and validation for component properties.
 *
 * @param {Options} [options] - Plugin options
 * @returns {import('metalsmith').Plugin} - Metalsmith plugin function
 */
function bundledComponents( options = {} ) {
  options = normalizeOptions( options );

  /**
   * The actual plugin function that processes files
   * @param {Object} files - Metalsmith files object
   * @param {import('metalsmith').Metalsmith} metalsmith - Metalsmith instance
   * @param {Function} done - Callback function for async completion
   */
  function plugin( files, metalsmith, done ) {
    const debug = metalsmith.debug( 'metalsmith-bundled-components' );
    debug( 'Running with options: %O', options );

    async function processComponents() {
      try {
        // Get the project root directory
        const projectRoot = metalsmith.directory();

        // Collect components from lib folder
        const baseComponents = collectComponents( path.join( projectRoot, options.basePath ) );
        const sectionComponents = collectComponents( path.join( projectRoot, options.sectionsPath ) );
        const allComponents = [ ...baseComponents, ...sectionComponents ];

        debug( 'Partials path: %s', path.join( projectRoot, options.basePath ) );
        debug( 'Sections path: %s', path.join( projectRoot, options.sectionsPath ) );
        debug( 'Found partials: %O', baseComponents.map( c => c.name ) );
        debug( 'Found sections: %O', sectionComponents.map( c => c.name ) );

        let componentMap = new Map();

        if ( allComponents.length === 0 ) {
          debug( 'No components found, processing main entries only' );
          // Skip component processing entirely
        } else {
          // Create component map for lookups
          componentMap = createComponentMap( allComponents );
          debug( 'Component map created with %d components', componentMap.size );

          // Validate section data if validation is enabled
          if ( options.validation.enabled ) {
            debug( 'Validating section data...' );

            const allValidationErrors = [];

            // Validate sections in each file (filter content files)
            Object.keys( files )
              .filter( fileName =>
                fileName.endsWith( '.html' ) ||
                fileName.endsWith( '.htm' ) ||
                fileName.endsWith( '.md' ) ||
                fileName.endsWith( '.markdown' )
              )
              .forEach( fileName => {
                const file = files[ fileName ];

                // Validate file.contents is a Buffer
                if ( file.contents && !Buffer.isBuffer( file.contents ) ) {
                  debug( 'Warning: file.contents is not a Buffer for %s', fileName );
                }

                if ( file.sections && Array.isArray( file.sections ) ) {
                  const fileErrors = validateSections( file.sections, ( sectionType ) => getManifest( componentMap, sectionType ), fileName );
                  allValidationErrors.push( ...fileErrors );

                  if ( !options.validation.reportAllErrors && fileErrors.length > 0 ) {
                    // Stop processing files after first error if reportAllErrors is false
                  }
                }
              } );

            // Handle validation errors
            if ( allValidationErrors.length > 0 ) {
              const errorMessage = `❌ Section Validation Errors:\n\n${ allValidationErrors.map( error => `  ${ error.message }` ).join( '\n\n' ) }`;

              console.error( errorMessage );

              if ( options.validation.strict ) {
                throw new Error( 'Section validation failed' );
              } else {
                console.warn( '\n⚠️  Validation errors found but continuing build (strict mode disabled)' );
                debug( 'Validation errors: %O', allValidationErrors );
              }
            } else {
              debug( '✓ All sections validated successfully' );
            }
          }

          // Validate all required components exist (replaces complex dependency ordering)
          const requirementErrors = validateRequirements( componentMap );

          if ( requirementErrors.length > 0 ) {
            console.error( 'Component requirement errors found:' );
            requirementErrors.forEach( error => console.error( `  - ${ error }` ) );
            throw new Error( 'Component requirement validation failed' );
          }
        }

        // Simple build order: base → sections
        // No dependency resolution needed since components are namespaced
        const buildOrder = [
          ...baseComponents.map( c => c.name ),
          ...sectionComponents.map( c => c.name )
        ];
        debug( 'Build order: %s', buildOrder.join( ' → ' ) );

        // PostCSS is handled via esbuild plugin
        if ( options.postcss && options.postcss.enabled ) {
          debug( 'PostCSS processing enabled with %d plugins', options.postcss.plugins?.length || 0 );
        }

        // Bundle components and main entries using esbuild with plugins
        // Process in order: main entries → base components → section components
        debug( 'Starting bundling process...' );
        const bundledAssets = await bundleWithESBuild(
          baseComponents,
          sectionComponents,
          projectRoot,
          options
        );
        debug( 'Bundled assets completed: %O', {
          hasCss: !!bundledAssets.css,
          hasJs: !!bundledAssets.js
        } );

        // Add bundled CSS (main + components) to Metalsmith files object
        if ( bundledAssets.css ) {
          files[ options.cssDest ] = {
            contents: Buffer.isBuffer( bundledAssets.css )
              ? bundledAssets.css
              : Buffer.from( bundledAssets.css, 'utf8' )
          };

          debug( `✓ Added bundled CSS to ${ options.cssDest }` );
        }

        // Add bundled JS (main + components) to Metalsmith files object
        if ( bundledAssets.js ) {
          files[ options.jsDest ] = {
            contents: Buffer.isBuffer( bundledAssets.js )
              ? bundledAssets.js
              : Buffer.from( bundledAssets.js, 'utf8' )
          };

          debug( `✓ Added bundled JS to ${ options.jsDest }` );
        }

      } catch ( error ) {
        throw error;
      }
    }

    // Execute async processing and handle callback
    processComponents()
      .then( () => done() )
      .catch( error => done( error ) );
  }

  // Set function name for better debugging
  Object.defineProperty( plugin, 'name', { value: 'bundledComponents' } );

  return plugin;
}

export default bundledComponents;