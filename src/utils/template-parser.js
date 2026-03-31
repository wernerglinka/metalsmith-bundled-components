/**
 * Template Parser - Detects component imports in Nunjucks templates
 *
 * Parses Nunjucks template files to detect which components are actually used
 * via {% from "..." import ... %} statements. This enables tree-shaking of
 * unused components for optimal bundle sizes.
 */

import fs from 'fs';
import path from 'path';

/**
 * Regular expression to match Nunjucks import statements
 * Matches: {% from "components/_partials/button/button.njk" import button %}
 * Also matches compact syntax: {%from"path"import name%}
 * Captures: The full path to the component template
 */
const IMPORT_PATTERN = /\{%\s*from\s*["']([^"']+)["']\s*import\s+[^%]+\s*%\}/g;

/**
 * Regular expression to match Nunjucks include statements
 * Matches: {% include "components/sections/header/header.njk" %}
 * Also matches compact syntax: {%include"path"%}
 * Captures: The full path to the included template
 */
const INCLUDE_PATTERN = /\{%\s*include\s*["']([^"']+)["']\s*%\}/g;

/**
 * Extract component name from a Nunjucks import path
 *
 * Examples:
 *   "components/_partials/button/button.njk" → "button"
 *   "components/sections/hero/hero.njk" → "hero"
 *   "_partials/ctas/ctas.njk" → "ctas"
 *
 * @param {string} importPath - The path from the {% from "..." %} statement
 * @param {string[]} componentDirs - Component directory names to look for (_partials, sections)
 * @returns {string|null} - Component name or null if not a component import
 */
function extractComponentName( importPath, componentDirs ) {
  // Split path into segments
  const segments = importPath.split( '/' );

  // Look for component directory markers (_partials, sections, etc.)
  for ( let i = 0; i < segments.length; i++ ) {
    if ( componentDirs.includes( segments[ i ] ) ) {
      // Component name is the next segment after the directory marker
      if ( i + 1 < segments.length ) {
        return segments[ i + 1 ];
      }
    }
  }

  return null;
}

/**
 * Parse a single template file for component imports
 *
 * @param {string} fileContent - Template file contents as string
 * @param {string[]} componentDirs - Component directory names (_partials, sections)
 * @returns {Set<string>} - Set of component names imported in this file
 */
function parseTemplateFile( fileContent, componentDirs ) {
  const importedComponents = new Set();
  let match;

  // Check {% from "..." import ... %} statements
  IMPORT_PATTERN.lastIndex = 0;
  while ( ( match = IMPORT_PATTERN.exec( fileContent ) ) !== null ) {
    const importPath = match[ 1 ];
    const componentName = extractComponentName( importPath, componentDirs );

    if ( componentName ) {
      importedComponents.add( componentName );
    }
  }

  // Check {% include "..." %} statements
  INCLUDE_PATTERN.lastIndex = 0;
  while ( ( match = INCLUDE_PATTERN.exec( fileContent ) ) !== null ) {
    const includePath = match[ 1 ];
    const componentName = extractComponentName( includePath, componentDirs );

    if ( componentName ) {
      importedComponents.add( componentName );
    }
  }

  return importedComponents;
}

/**
 * Recursively walk any value (object or array) and collect all sectionType strings.
 *
 * This handles deeply nested component references such as tab panes, carousel slides,
 * accordion panels, or any other wrapper component that embeds sub-components via a
 * sectionType property at an arbitrary depth in the frontmatter tree.
 *
 * @param {*} value - Any frontmatter value to inspect
 * @param {Set<string>} result - Accumulator set for discovered sectionType values
 */
function collectSectionTypes( value, result ) {
  if ( !value || typeof value !== 'object' ) { return; }

  if ( Array.isArray( value ) ) {
    value.forEach( item => collectSectionTypes( item, result ) );
    return;
  }

  if ( value.sectionType && typeof value.sectionType === 'string' ) {
    result.add( value.sectionType );
  }

  Object.values( value ).forEach( child => collectSectionTypes( child, result ) );
}

/**
 * Detect all used components across all template files and layout files
 *
 * Scans Metalsmith files object and layout directory for:
 * 1. Components in frontmatter — any sectionType value at any nesting depth
 * 2. Component imports in Nunjucks {% from "..." import ... %} statements
 * 3. Components in layout files via {% include "..." %} and {% from "..." import ... %}
 *
 * @param {Object} files - Metalsmith files object
 * @param {string[]} componentDirs - Component directory names (e.g., ['_partials', 'sections'])
 * @param {string|null} layoutDir - Path to layouts directory for scanning (or null to skip)
 * @returns {Set<string>} - Set of all component names used in templates
 */
function detectUsedComponents( files, componentDirs, layoutDir ) {
  const allUsedComponents = new Set();

  // Process all template files in Metalsmith files object
  Object.keys( files ).forEach( filepath => {
    // Only process template files
    if ( !filepath.endsWith( '.njk' ) && !filepath.endsWith( '.html' ) ) {
      return;
    }

    const file = files[ filepath ];

    // Walk the entire file frontmatter and collect every sectionType value.
    // This covers top-level sections as well as sub-components nested at any
    // depth (e.g. tab panes, carousel slides, accordion panels).
    collectSectionTypes( file, allUsedComponents );

    // Skip template parsing if no contents
    if ( !file.contents ) {
      return;
    }

    // Get file contents as string
    const content = Buffer.isBuffer( file.contents )
      ? file.contents.toString( 'utf8' )
      : String( file.contents );

    // Parse Nunjucks imports and add components to the set
    const fileComponents = parseTemplateFile( content, componentDirs );
    fileComponents.forEach( component => allUsedComponents.add( component ) );
  } );

  // Also scan layout files if layoutDir is provided
  if ( layoutDir ) {
    const layoutComponents = scanLayoutFiles( layoutDir, componentDirs );
    layoutComponents.forEach( component => allUsedComponents.add( component ) );
  }

  return allUsedComponents;
}

/**
 * Recursively scan layout directory for .njk template files and detect components
 * @param {string} layoutDir - Path to the layout directory
 * @param {string[]} componentDirs - Component directory names (_partials, sections)
 * @returns {Set<string>} - Set of component names found in layout files
 */
function scanLayoutFiles( layoutDir, componentDirs ) {
  const components = new Set();

  // Check if directory exists
  if ( !fs.existsSync( layoutDir ) ) {
    return components;
  }

  function scanDirectory( dir ) {
    const entries = fs.readdirSync( dir, { withFileTypes: true } );

    for ( const entry of entries ) {
      const fullPath = path.join( dir, entry.name );

      if ( entry.isDirectory() ) {
        // Recursively scan subdirectories
        scanDirectory( fullPath );
      } else if ( entry.isFile() && entry.name.endsWith( '.njk' ) ) {
        // Parse .njk template files
        try {
          const content = fs.readFileSync( fullPath, 'utf8' );
          const fileComponents = parseTemplateFile( content, componentDirs );
          fileComponents.forEach( comp => components.add( comp ) );
        } catch {
          // Silently skip files that can't be read
        }
      }
    }
  }

  scanDirectory( layoutDir );
  return components;
}

export {
  detectUsedComponents,
  parseTemplateFile,
  extractComponentName,
  scanLayoutFiles,
  collectSectionTypes
};
