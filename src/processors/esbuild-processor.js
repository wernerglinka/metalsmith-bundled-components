import fs from 'fs';
import path from 'path';
import os from 'os';
import { build } from 'esbuild';
import postcssPlugin from 'esbuild-plugin-postcss';

/**
 * @typedef {Object} BundledAssets
 * @property {string|null} css - Bundled CSS content or null if no CSS
 * @property {string|null} js - Bundled JavaScript content or null if no JS
 */

/**
 * Bundle main entries and components using esbuild with plugins for modern, optimized output
 * - Uses esbuild.build() for full plugin ecosystem support
 * - Integrates PostCSS via esbuild-plugin-postcss
 * - Merges main entries with component assets into single output files
 * - Processing order: Main entries → Base components → Section components
 * - Supports tree shaking, minification (via minifyOutput flag), and modern JS output
 * 
 * @param {Array} baseComponents - Base/partial components
 * @param {Array} sectionComponents - Section components
 * @param {string} projectRoot - Project root directory for resolving paths
 * @param {Object} options - Plugin options including minifyOutput, PostCSS config, etc.
 * @returns {Promise<BundledAssets>} Promise resolving to merged main + component assets
 */
async function bundleWithESBuild( baseComponents, sectionComponents, projectRoot, options ) {
  // Use Sets to automatically deduplicate shared CSS/JS files across components
  // Multiple components can reference same utility files (e.g., shared/button.css)
  const cssEntryPoints = new Set();
  const jsEntryPoints = new Set();

  // Track temp files for cleanup at the end
  const tempFiles = [];

  // Create temp directory for bundling operations
  const tempDir = fs.mkdtempSync( path.join( os.tmpdir(), 'metalsmith-bundled-' ) );

  // Add main entries first (if specified)
  // If no main entries are specified, will bundle components only
  if ( options.mainCSSEntry ) {
    const mainCSSPath = path.resolve( projectRoot, options.mainCSSEntry );
    if ( fs.existsSync( mainCSSPath ) ) {
      cssEntryPoints.add( mainCSSPath );
    }
  }

  if ( options.mainJSEntry ) {
    const mainJSPath = path.resolve( projectRoot, options.mainJSEntry );
    if ( fs.existsSync( mainJSPath ) ) {
      jsEntryPoints.add( mainJSPath );
    }
  }

  // Collect component files
  // Base components first (for foundational styles), then sections
  const allComponents = [
    ...baseComponents,
    ...sectionComponents
  ];

  allComponents.forEach( component => {
    // Add CSS files (Set automatically deduplicates shared dependencies)
    component.styles.forEach( styleFile => {
      const filePath = path.join( component.path, styleFile );
      if ( fs.existsSync( filePath ) ) {
        cssEntryPoints.add( filePath );
      }
    } );

    // Add JS files (Set automatically deduplicates shared dependencies)
    component.scripts.forEach( scriptFile => {
      const filePath = path.join( component.path, scriptFile );
      if ( fs.existsSync( filePath ) ) {
        jsEntryPoints.add( filePath );
      }
    } );
  } );

  // Configure esbuild plugins for enhanced CSS/JS processing
  const plugins = [];

  // Add PostCSS plugin if configured
  if ( options.postcss && options.postcss.enabled ) {
    plugins.push( postcssPlugin.default( {
      plugins: options.postcss.plugins || [],
      ...( options.postcss.options || {} )
    } ) );
  }

  // Bundle CSS if we have any CSS files
  let cssContent = null;
  if ( cssEntryPoints.size > 0 ) {
    try {
      // Concatenate all CSS files (main + components) into one temp file
      const cssContents = [];

      for ( const cssFile of cssEntryPoints ) {
        if ( fs.existsSync( cssFile ) ) {
          const content = fs.readFileSync( cssFile, 'utf8' );
          cssContents.push( content );
        }
      }

      if ( cssContents.length > 0 ) {
        // 1. Concatenate main CSS with all component CSS
        const combinedCSS = cssContents.join( '\n\n' );

        // 2. Copy concatenated CSS to temp directory as main.css
        const tempMainCSS = path.join( tempDir, 'main.css' );
        fs.writeFileSync( tempMainCSS, combinedCSS );
        tempFiles.push( tempMainCSS );

        // 3. Copy @import files to temp directory (if main CSS entry exists)
        if ( options.mainCSSEntry && cssEntryPoints.size > 0 ) {
          const mainCSSFile = Array.from( cssEntryPoints )[ 0 ]; // Convert Set to array to get first item
          const mainCSSDir = path.dirname( mainCSSFile );

          // Copy all CSS files from the same directory as main.css (for @import './file.css')
          const assetsFiles = fs.readdirSync( mainCSSDir );
          assetsFiles.forEach( file => {
            if ( file.endsWith( '.css' ) && file !== path.basename( mainCSSFile ) ) {
              fs.copyFileSync( path.join( mainCSSDir, file ), path.join( tempDir, file ) );
              tempFiles.push( path.join( tempDir, file ) );
            }
          } );

          // Also copy styles directory if it exists (for @import './styles/file.css')
          const stylesDir = path.join( mainCSSDir, 'styles' );
          if ( fs.existsSync( stylesDir ) ) {
            const tempStylesDir = path.join( tempDir, 'styles' );
            fs.mkdirSync( tempStylesDir, { recursive: true } );

            const styleFiles = fs.readdirSync( stylesDir );
            styleFiles.forEach( file => {
              if ( file.endsWith( '.css' ) ) {
                fs.copyFileSync( path.join( stylesDir, file ), path.join( tempStylesDir, file ) );
                tempFiles.push( path.join( tempStylesDir, file ) );
              }
            } );
          }
        }

        // 4. Process the concatenated CSS with esbuild to resolve @imports and apply minification
        const result = await build( {
          entryPoints: [ tempMainCSS ],
          bundle: true, // Enable bundling to resolve @import statements
          write: false,
          plugins,
          loader: { '.css': 'css' },
          minify: options.minifyOutput === true,
          logLevel: 'silent',
          absWorkingDir: tempDir // Use temp directory where files are copied
        } );

        // 5. Extract processed CSS content (ready for output to build directory)
        if ( result.outputFiles && result.outputFiles.length > 0 ) {
          cssContent = result.outputFiles[ 0 ].text;
        }

        // 6. Temp directory cleanup happens at the end of the function
      }

    } catch ( error ) {
      console.error( 'Error bundling CSS:', error.message );
    }
  }

  // Bundle JS if we have any JS files
  let jsContent = null;
  if ( jsEntryPoints.size > 0 ) {
    try {
      // Create a temporary entry file in system temp directory
      // tempDir already created above
      const tempJSEntry = path.join( tempDir, 'entry.js' );
      tempFiles.push( tempDir ); // Track temp directory for cleanup
      
      const jsEntryArray = Array.from( jsEntryPoints ).filter( file => fs.existsSync( file ) );
      
      // Check if we have any valid JS files
      if ( jsEntryArray.length === 0 ) {
        jsContent = null;
      } else {
        // Separate main entry from component files
        let mainEntryFile = null;
        const componentFiles = [];
        
        jsEntryArray.forEach( ( file, index ) => {
          const isMainEntry = index === 0 && options.mainJSEntry &&
            path.resolve( projectRoot, options.mainJSEntry ) === file;
          
          if ( isMainEntry ) {
            mainEntryFile = file;
          } else {
            componentFiles.push( file );
          }
        } );
        
        // Create entry file content
        let entryContent = '';
        
        // Import main entry if it exists
        if ( mainEntryFile ) {
          entryContent += `// Main entry: ${ path.relative( projectRoot, mainEntryFile ) }\n`;
          entryContent += `import '${mainEntryFile}';\n\n`;
        }
        
        // For component files, we need to maintain isolation
        // Since ES modules are already isolated, we just import them
        componentFiles.forEach( ( file, index ) => {
          entryContent += `// Component ${ index }: ${ path.relative( projectRoot, file ) }\n`;
          entryContent += `import '${file}';\n`;
        } );
        
        // Write the entry file with import statements
        fs.writeFileSync( tempJSEntry, entryContent );
        tempFiles.push( tempJSEntry ); // Track for cleanup later

        // Verify file was created
        if ( !fs.existsSync( tempJSEntry ) ) {
          throw new Error( `Failed to create temp JS file at ${ tempJSEntry }` );
        }

        const result = await build( {
          entryPoints: [ tempJSEntry ],
          bundle: true,
          write: false,
          plugins,
          format: 'iife',
          minify: options.minifyOutput === true,
          target: options.target || 'es2020',
          treeShaking: true,
          logLevel: 'silent',
          absWorkingDir: projectRoot // Set working directory for better path resolution
        } );

        // Extract JS from the result
        if ( result.outputFiles && result.outputFiles.length > 0 ) {
          jsContent = result.outputFiles[ 0 ].text;
        }

        // Don't clean up here - will clean up all temp files at the end
      }

    } catch ( error ) {
      console.error( 'Error bundling JS:', error.message );
    }
  }

  // Clean up all temp files and directories at the end
  tempFiles.forEach( tempPath => {
    try {
      if ( fs.existsSync( tempPath ) ) {
        const stats = fs.statSync( tempPath );
        if ( stats.isDirectory() ) {
          // Remove directory and its contents
          fs.rmSync( tempPath, { recursive: true, force: true } );
        } else {
          // Remove file
          fs.unlinkSync( tempPath );
        }
      }
    } catch {
      // Silently ignore cleanup errors - they're not critical
    }
  } );

  return {
    css: cssContent,
    js: jsContent
  };
}

export { bundleWithESBuild };