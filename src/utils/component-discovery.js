import fs from 'fs';
import path from 'path';

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

export { collectComponents, loadComponent, autoGenerateManifest, createComponentMap };