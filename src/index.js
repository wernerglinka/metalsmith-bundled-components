import path from 'path';
import { normalizeOptions } from './utils/options.js';
import { collectComponents, createComponentMap } from './utils/component-discovery.js';
import { validateRequirements } from './utils/requirement-validator.js';
import { bundleWithESBuild } from './processors/esbuild-processor.js';
import { validateSections } from './utils/validation.js';
import { detectUsedComponents } from './utils/template-parser.js';
import { resolveAllDependencies, filterNeededComponents } from './utils/dependency-resolver.js';
import { getManifest } from './utils/component-helpers.js';

/**
 * @typedef {Object} BundledAssets
 * @property {string|null} css - Bundled CSS content or null if no CSS
 * @property {string|null} js - Bundled JavaScript content or null if no JS
 */

/**
 * @typedef {import('./utils/options.js').BundledComponentsOptions} Options
 */

/**
 * A Metalsmith plugin that automatically discovers and bundles CSS and JavaScript files
 * from component-based architectures using esbuild. All component styles and scripts are
 * merged into the main CSS and JS files, creating a single bundle for each asset type.
 * Processing order: main entries → base components → section components.
 * Includes PostCSS support via esbuild plugins and validation for component properties.
 *
 * TWO-PHASE PLUGIN PATTERN:
 * Phase 1: Configuration phase - Normalizes and validates options once at plugin registration
 * Phase 2: Execution phase - Processes files during Metalsmith build (can run multiple times)
 *
 * Benefits:
 * - Options are validated once, not on every build
 * - Expensive setup operations (like parsing PostCSS config) happen once
 * - The returned plugin function is lightweight and optimized for repeated execution
 * - Supports Metalsmith's watch mode where plugin may be called multiple times
 *
 * @param {Options} [options] - Plugin options
 * @returns {import('metalsmith').Plugin} - Metalsmith plugin function
 */
function bundledComponents( options = {} ) {
  // PHASE 1: Configuration - Normalize options once at plugin registration time
  // This runs only once when .use(bundledComponents(options)) is called
  options = normalizeOptions( options );

  /**
   * PHASE 2: Execution - The actual plugin function that processes files
   * This runs during the Metalsmith build and may be called multiple times in watch mode
   *
   * @param {Object} files - Metalsmith files object
   * @param {import('metalsmith').Metalsmith} metalsmith - Metalsmith instance
   * @param {Function} done - Callback function for async completion
   */
  function plugin( files, metalsmith, done ) {
    const debug = metalsmith.debug( 'metalsmith-bundled-components' );
    debug( 'Running with options: %O', options );

    async function processComponents() {
      try {
        /*
         * Component Discovery
         */
        // Use metalsmith.path() for consistent cross-platform path handling
        const basePath = metalsmith.path( options.basePath );
        const sectionsPath = metalsmith.path( options.sectionsPath );
        const layoutPath = metalsmith.path( options.layoutsPath );

        // Scans lib folder for all available components in
        // _partials and sections folders
        const allBaseComponents = collectComponents( basePath );
        const allSectionComponents = collectComponents( sectionsPath );
        const allComponents = [ ...allBaseComponents, ...allSectionComponents ];

        debug( 'Partials path: %s', basePath );
        debug( 'Sections path: %s', sectionsPath );
        debug( 'Found all partials: %O', allBaseComponents.map( c => c.name ) );
        debug( 'Found all sections: %O', allSectionComponents.map( c => c.name ) );

        // Fail fast if no components found - this indicates a configuration error
        if ( allComponents.length === 0 ) {
          const error = new Error(
            `No components found in specified directories.
  - basePath: ${ options.basePath }
  - sectionsPath: ${ options.sectionsPath }

This likely indicates a configuration error. Please verify:
  1. Component directories exist and contain components
  2. Paths are correct relative to project root
  3. Component folders follow expected structure (component-name/component-name.njk)`
          );
          throw error;
        }

        /*
         * Template Analysis - Tree Shaking
         * Detect which components are actually used in templates
         * (from page frontmatter, template content, and layout files)
         */

        // Extract directory names from paths, for example 'lib/components/_partials' → '_partials'
        const componentDirs = [
          path.basename( options.basePath ),
          path.basename( options.sectionsPath )
        ];

        // Scan all templates and layout files that are actually used
        const usedComponents = detectUsedComponents( files, componentDirs, layoutPath );
        debug( 'All components used (pages + layouts): %O', [ ...usedComponents ] );

        // Create component map for available components
        const componentMap = createComponentMap( allComponents );
        debug( 'Component map created with %d available components', componentMap.size );

        /*
         * Resolve transitive dependencies
         */
        const neededComponents = resolveAllDependencies( usedComponents, componentMap );
        debug( 'Components needed (including dependencies): %O', [ ...neededComponents ] );

        // Filter to only needed components
        const baseComponents = filterNeededComponents( allBaseComponents, neededComponents );
        const sectionComponents = filterNeededComponents( allSectionComponents, neededComponents );

        debug( 'Filtered partials to bundle: %O', baseComponents.map( c => c.name ) );
        debug( 'Filtered sections to bundle: %O', sectionComponents.map( c => c.name ) );

        /*
         * Validate section data if validation is enabled
         * Validates component data from page frontmatter against validation schemas 
         * defined in component manifest files.
         */
        if ( options.validation.enabled ) {
          debug( 'Validating section data...' );

          const allValidationErrors = [];

          // Only validate content files (HTML/Markdown) that might contain sections 
          // frontmatter. Skip assets like images, CSS, JS files.
          Object.keys( files )
            .filter( fileName =>
              fileName.endsWith( '.html' ) ||
              fileName.endsWith( '.htm' ) ||
              fileName.endsWith( '.md' ) ||
              fileName.endsWith( '.markdown' )
            )
            .forEach( fileName => {
              const file = files[ fileName ];
              const { contents, sections } = file;

              // Validate file.contents is a Buffer
              if ( contents && !Buffer.isBuffer( contents ) ) {
                debug( 'Warning: file.contents is not a Buffer for %s', fileName );
              }

              // Collect all validation errors across all files. Allows reporting
              // multiple errors at once rather than failing on the first error.
              if ( sections && Array.isArray( sections ) ) {
                const fileErrors = validateSections( sections, ( sectionType ) => getManifest( componentMap, sectionType ), fileName );
                allValidationErrors.push( ...fileErrors );
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

        /*
         * Simple build order: base → sections (in filesystem discovery order)
         * No dependency resolution needed since components are namespaced (CSS)
         * and wrapped in IIFEs (JS), so load order doesn't affect functionality
         */
        const buildOrder = [
          ...baseComponents.map( c => c.name ),
          ...sectionComponents.map( c => c.name )
        ];
        debug( 'Build order: %s', buildOrder.join( ' → ' ) );

        // PostCSS is handled via esbuild plugin
        if ( options.postcss && options.postcss.enabled ) {
          debug( 'PostCSS processing enabled with %d plugins', options.postcss.plugins?.length || 0 );
        }

        /*
         * Bundle components and main entries using esbuild with plugins
         * Process in order: main entries → base components → section components
         */
        debug( 'Starting bundling process...' );
        const bundledAssets = await bundleWithESBuild(
          baseComponents,
          sectionComponents,
          metalsmith.directory(),
          options
        );
        debug( 'Bundled assets completed: %O', {
          hasCss: !!bundledAssets.css,
          hasJs: !!bundledAssets.js
        } );

        // Add bundled CSS (main + components) to Metalsmith files object
        // Instead of writing files directly to disk with fs.writeFileSync(),
        //  add them to the files object. Metalsmith then:
        // - Handles the actual writing to disk
        // - Allows other plugins to process these files further
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