/* eslint-env node,mocha */
import assert from 'node:assert';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import equals from 'assert-dir-equal';
import Metalsmith from 'metalsmith';
import bundledComponents from '../src/index.js';

const __dirname = dirname( fileURLToPath( import.meta.url ) );

function fixture( p ) {
  return resolve( __dirname, 'fixtures', p );
}

describe( 'metalsmith-bundled-components', () => {
  it( 'should export a named plugin function matching package.json name', () => {
    assert.strictEqual( bundledComponents.name, 'bundledComponents' );
  } );

  it( 'should not crash the metalsmith build when using default options', ( done ) => {
    Metalsmith( fixture( 'default' ) )
      .use( bundledComponents() )
      .build( ( err ) => {
        if ( err ) {done( err );}
        assert.strictEqual( err, null );
        equals( fixture( 'default/build' ), fixture( 'default/expected' ) );
        done();
      } );
  } );

  it( 'should generate bundled CSS and JS files with custom paths', ( done ) => {
    Metalsmith( fixture( 'custom-paths' ) )
      .use( bundledComponents( {
        basePath: 'components/base',
        sectionsPath: 'components/sections',
        cssDest: 'assets/custom.css',
        jsDest: 'assets/custom.js'
      } ) )
      .build( ( err ) => {
        if ( err ) {done( err );}
        assert.strictEqual( err, null );

        // Check that the files exist in the expected locations
        equals( fixture( 'custom-paths/build' ), fixture( 'custom-paths/expected' ) );
        done();
      } );
  } );

  // Add additional tests for components with dependencies
  it( 'should bundle components in dependency order', ( done ) => {
    Metalsmith( fixture( 'dependencies' ) )
      .use( bundledComponents() )
      .build( ( err ) => {
        if ( err ) {done( err );}
        assert.strictEqual( err, null );

        // Verify content is in the correct order
        const cssContent = readFileSync( fixture( 'dependencies/build/assets/components.css' ), 'utf8' );
        const jsContent = readFileSync( fixture( 'dependencies/build/assets/components.js' ), 'utf8' );

        // Base component should come before dependent component
        assert.ok( cssContent.indexOf( 'Component: base' ) < cssContent.indexOf( 'Component: dependent' ) );
        assert.ok( jsContent.indexOf( 'Component: base' ) < jsContent.indexOf( 'Component: dependent' ) );

        equals( fixture( 'dependencies/build' ), fixture( 'dependencies/expected' ) );
        done();
      } );
  } );

  // Test error cases
  it( 'should report circular dependencies', ( done ) => {
    Metalsmith( fixture( 'circular-deps' ) )
      .use( bundledComponents() )
      .build( ( err ) => {
        assert.ok( err instanceof Error );
        assert.ok( err.message.includes( 'Circular dependency' ) );
        done();
      } );
  } );
} );
