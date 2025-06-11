import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

/**
 * @typedef {Object} ComponentManifest
 * @property {string} name - Component name
 * @property {string} [type] - Component type (e.g., 'auto', 'manual')
 * @property {string[]} styles - Array of CSS file names
 * @property {string[]} scripts - Array of JS file names
 * @property {string[]} dependencies - Array of component names this component depends on
 */

/**
 * @typedef {Object} Component
 * @property {string} name - Component name
 * @property {string} [type] - Component type
 * @property {string[]} styles - Array of CSS file names
 * @property {string[]} scripts - Array of JS file names
 * @property {string[]} dependencies - Array of component names this component depends on
 * @property {string} path - Full path to component directory
 */

/**
 * @typedef {Object} BundledAssets
 * @property {string|null} css - Bundled CSS content or null if no CSS
 * @property {string|null} js - Bundled JavaScript content or null if no JS
 */

/**
 * @typedef {Object} PostCSSConfiguration
 * @property {Array} [plugins] - Array of PostCSS plugins
 * @property {Object} [options] - PostCSS processing options
 * @property {boolean} [enabled] - Whether PostCSS processing is enabled
 */

/**
 * @typedef {Object} BundledComponentsOptions
 * @property {string} [basePath] - Path to base components directory (partials)
 * @property {string} [sectionsPath] - Path to sections components directory
 * @property {string} [cssDest] - Destination path for bundled CSS
 * @property {string} [jsDest] - Destination path for bundled JS
 * @property {PostCSSConfiguration} [postcss] - PostCSS configuration
 */

/**
 * Collect components from a directory
 * @param {string} dirPath - Directory to scan
 * @returns {Array} Array of component objects
 */
function collectComponents( dirPath ) {
  if ( !fs.existsSync( dirPath ) ) {
    return []; // Directory is optional
  }

  const items = fs.readdirSync( dirPath );
  const components = [];

  items.forEach( item => {
    const itemPath = path.join( dirPath, item );
    const stats = fs.statSync( itemPath );

    if ( !stats.isDirectory() ) {return;}

    const component = loadComponent( itemPath, item );
    if ( component ) {
      components.push( component );
    }
  } );

  return components;
}

/**
 * Load a single component from directory
 * @param {string} componentPath - Component directory path
 * @param {string} componentName - Component name
 * @returns {Object|null} Component object or null if invalid
 */
function loadComponent( componentPath, componentName ) {
  const manifestPath = path.join( componentPath, 'manifest.json' );
  let manifest;

  if ( fs.existsSync( manifestPath ) ) {
    try {
      manifest = JSON.parse( fs.readFileSync( manifestPath, 'utf8' ) );
    } catch ( error ) {
      console.error( `Invalid manifest.json in ${ componentName }: ${ error.message }` );
      return null;
    }
  } else {
    // Auto-generate manifest for simple components
    manifest = autoGenerateManifest( componentPath, componentName );
  }

  // Validate manifest has required fields
  if ( !manifest.name ) {
    console.error( `Missing 'name' in manifest for ${ componentName }` );
    return null;
  }

  return {
    ...manifest,
    path: componentPath,
    // Ensure arrays exist
    styles: manifest.styles || [],
    scripts: manifest.scripts || [],
    dependencies: manifest.dependencies || []
  };
}

/**
 * Auto-generate manifest for components without one
 * @param {string} componentPath - Component directory
 * @param {string} componentName - Component name
 * @returns {Object} Generated manifest
 */
function autoGenerateManifest( componentPath, componentName ) {
  const cssFile = `${ componentName }.css`;
  const jsFile = `${ componentName }.js`;

  return {
    name: componentName,
    type: 'auto',
    styles: fs.existsSync( path.join( componentPath, cssFile ) ) ? [ cssFile ] : [],
    scripts: fs.existsSync( path.join( componentPath, jsFile ) ) ? [ jsFile ] : [],
    dependencies: []
  };
}

/**
 * Create a Map from component array for efficient lookups
 * @param {Array} components - Array of components
 * @returns {Map} Component map keyed by name
 */
function createComponentMap( components ) {
  const componentMap = new Map();

  components.forEach( component => {
    if ( componentMap.has( component.name ) ) {
      throw new Error( `Duplicate component name: ${ component.name }` );
    }
    componentMap.set( component.name, component );
  } );

  return componentMap;
}

/**
 * Validate all component dependencies exist
 * @param {Map} componentMap - Component map
 * @returns {Array} Array of error messages
 */
function validateDependencies( componentMap ) {
  const errors = [];

  componentMap.forEach( ( component, name ) => {
    component.dependencies.forEach( dependency => {
      if ( !componentMap.has( dependency ) ) {
        errors.push( `Component '${ name }' depends on unknown component '${ dependency }'` );
      }
    } );
  } );

  return errors;
}

/**
 * Resolve dependency order using depth-first traversal
 * Implements a topological sort using depth-first search (DFS) to determine 
 * the correct build order for components based on their dependencies
 * The final order ensures that:
 * - Dependencies are always built before components that need them
 * - CSS is output in the correct order (dependencies first)
 * - JavaScript initializes in the correct order
 * - No circular dependencies are allowed
 * 
 * @param {Map} componentMap - Component map
 * @returns {Array} Ordered component names
 */
function resolveDependencyOrder( componentMap ) {
  const visited = new Set();
  const visiting = new Set();
  const order = [];

  /**
   * Visit component and dependencies
   * @param {string} name - Component name
   * @param {Array} path - Current path for cycle detection
   */
  function visit( name, path = [] ) {
    if ( visited.has( name ) ) {return;}

    if ( visiting.has( name ) ) {
      throw new Error( `Circular dependency: ${ path.join( ' → ' ) } → ${ name }` );
    }

    visiting.add( name );
    const component = componentMap.get( name );

    // Visit dependencies first
    component.dependencies.forEach( dependency => {
      visit( dependency, [ ...path, name ] );
    } );

    visiting.delete( name );
    visited.add( name );
    order.push( name );
  }

  // Visit all components
  componentMap.forEach( ( _, name ) => visit( name ) );

  return order;
}

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

  return normalized;
}

/**
 * A Metalsmith plugin that automatically discovers, orders, and bundles CSS and JavaScript files 
 * from a component-based architecture. It solves the problem of keeping component assets 
 * (styles and scripts) colocated with their templates while producing optimized, 
 * dependency-ordered output files.
 *
 * @param {BundledComponentsOptions} [options] - Plugin options
 * @returns {import('metalsmith').Plugin} - Metalsmith plugin function
 */
function bundledComponents( options = {} ) {
  options = normalizeOptions( options );

  return function bundledComponents( files, metalsmith, done ) {
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

        // Validate all dependencies exist
        const validationErrors = validateDependencies( componentMap );

        if ( validationErrors.length > 0 ) {
          console.error( 'Component errors found:' );
          validationErrors.forEach( error => console.error( `  - ${ error }` ) );
          throw new Error( 'Component validation failed' );
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
            contents: Buffer.from( bundledAssets.css )
          };

          debug( `✓ Added ${ options.cssDest } to build` );
        }

        // Add component JS to Metalsmith files object
        if ( bundledAssets.js ) {
          files[ options.jsDest ] = {
            contents: Buffer.from( bundledAssets.js )
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
  };
}

export default bundledComponents;