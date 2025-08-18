import path from 'path';
import { normalizeOptions } from './utils/options.js';
import { collectComponents, createComponentMap } from './utils/component-discovery.js';
import { validateDependencies, resolveDependencyOrder } from './utils/dependency-resolver.js';
import { createPostCSSProcessor } from './processors/postcss-processor.js';
import { bundleComponents } from './processors/bundle-processor.js';
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
 * A Metalsmith plugin that automatically discovers, orders, and bundles CSS and JavaScript files 
 * from a component-based architecture. It solves the problem of keeping component assets 
 * (styles and scripts) colocated with their templates while producing optimized, 
 * dependency-ordered output files.
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
   * @param {Function} done - Callback function
   */
  function plugin( files, metalsmith, done ) {
    const debug = metalsmith.debug ? metalsmith.debug( 'metalsmith-bundled-components' ) : () => { };
    debug( 'Running with options: %O', options );

    async function processComponents() {
      try {
        // Get the project root directory (parent of metalsmith._directory)
        const projectRoot = path.resolve( metalsmith._directory );

        // Collect components from lib folder
        const baseComponents = collectComponents( path.join( projectRoot, options.basePath ) );
        const sectionComponents = collectComponents( path.join( projectRoot, options.sectionsPath ) );
        const allComponents = [ ...baseComponents, ...sectionComponents ];

        debug( 'Partials path: %s', path.join( projectRoot, options.basePath ) );
        debug( 'Sections path: %s', path.join( projectRoot, options.sectionsPath ) );
        debug( 'Found partials: %O', baseComponents.map( c => c.name ) );
        debug( 'Found sections: %O', sectionComponents.map( c => c.name ) );

        if ( allComponents.length === 0 ) {
          debug( 'No components found' );
          return;
        }

        // Create component map for lookups
        const componentMap = createComponentMap( allComponents );
        debug( 'Component map created with %d components', componentMap.size );

        // Validate section data if validation is enabled
        if ( options.validation.enabled ) {
          debug( 'Validating section data...' );
          
          const getManifest = ( sectionType ) => {
            const component = componentMap.get( sectionType );
            if ( !component ) {
              throw new Error( `Component "${sectionType}" not found` );
            }
            return component;
          };

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
                const fileErrors = validateSections( file.sections, getManifest, fileName );
                allValidationErrors.push( ...fileErrors );
                
                if ( !options.validation.reportAllErrors && fileErrors.length > 0 ) {
                  return; // Stop processing files after first error if reportAllErrors is false
                }
              }
            } );

          // Handle validation errors
          if ( allValidationErrors.length > 0 ) {
            const errorMessage = '❌ Section Validation Errors:\n\n' +
              allValidationErrors.map( error => `  ${error.message}` ).join( '\n\n' );

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

        // Validate all dependencies exist
        const dependencyErrors = validateDependencies( componentMap );

        if ( dependencyErrors.length > 0 ) {
          console.error( 'Component dependency errors found:' );
          dependencyErrors.forEach( error => console.error( `  - ${ error }` ) );
          throw new Error( 'Component dependency validation failed' );
        }

        // Resolve build order
        const buildOrder = resolveDependencyOrder( componentMap );
        debug( 'Build order: %s', buildOrder.join( ' → ' ) );

        // Create PostCSS processor if enabled
        const postcssProcessor = createPostCSSProcessor( options.postcss );

        if ( postcssProcessor ) {
          debug( 'PostCSS processing enabled with %d plugins', options.postcss.plugins.length );
        }

        // Bundle components (now async due to PostCSS)
        const bundledAssets = await bundleComponents( buildOrder, componentMap, postcssProcessor );
        debug( 'Bundled assets completed' );

        // Add component CSS to Metalsmith files object
        if ( bundledAssets.css ) {
          files[ options.cssDest ] = {
            contents: Buffer.isBuffer( bundledAssets.css ) 
              ? bundledAssets.css 
              : Buffer.from( bundledAssets.css, 'utf8' )
          };

          debug( `✓ Added ${ options.cssDest } to build` );
        }

        // Add component JS to Metalsmith files object
        if ( bundledAssets.js ) {
          files[ options.jsDest ] = {
            contents: Buffer.isBuffer( bundledAssets.js )
              ? bundledAssets.js
              : Buffer.from( bundledAssets.js, 'utf8' )
          };

          debug( `✓ Added ${ options.jsDest } to build` );
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