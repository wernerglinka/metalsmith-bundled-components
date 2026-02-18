import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { collectComponents, loadComponent, autoGenerateManifest, createComponentMap } from '../../src/utils/component-discovery.js';

describe( 'Utils - Component Discovery', () => {
  describe( 'collectComponents', () => {
    it( 'should return empty array for non-existent directory', () => {
      const result = collectComponents( '/non/existent/path' );
      assert.deepStrictEqual( result, [] );
    } );

    it( 'should collect components from existing directory', () => {
      const testDir = 'test/fixtures/default/lib/layouts/components/_partials';
      const result = collectComponents( testDir );
      
      assert( Array.isArray( result ) );
      assert( result.length > 0 );
      assert( result.some( c => c.name === 'button' ) );
    } );

    it( 'should skip non-directory items', () => {
      // Create a temporary directory with a file
      const tempDir = 'test/temp-discovery';
      const tempFile = path.join( tempDir, 'not-a-dir.txt' );
      
      if ( !fs.existsSync( tempDir ) ) {
        fs.mkdirSync( tempDir, { recursive: true } );
      }
      fs.writeFileSync( tempFile, 'test' );
      
      try {
        const result = collectComponents( tempDir );
        assert.deepStrictEqual( result, [] );
      } finally {
        // Cleanup
        if ( fs.existsSync( tempFile ) ) {fs.unlinkSync( tempFile );}
        if ( fs.existsSync( tempDir ) ) {fs.rmdirSync( tempDir );}
      }
    } );
  } );

  describe( 'loadComponent', () => {
    it( 'should load component with manifest file', () => {
      const componentPath = 'test/fixtures/default/lib/layouts/components/sections/banner';
      const result = loadComponent( componentPath, 'banner' );
      
      assert.strictEqual( result.name, 'banner' );
      assert( Array.isArray( result.styles ) );
      assert( Array.isArray( result.scripts ) );
      assert( Array.isArray( result.dependencies ) );
      assert.strictEqual( result.path, componentPath );
    } );

    it( 'should auto-generate manifest for component without manifest file', () => {
      const componentPath = 'test/fixtures/default/lib/layouts/components/_partials/button';
      const result = loadComponent( componentPath, 'button' );
      
      assert.strictEqual( result.name, 'button' );
      assert.strictEqual( result.type, 'auto' );
      assert( result.styles.includes( 'button.css' ) );
      assert( result.scripts.includes( 'button.js' ) );
      assert.deepStrictEqual( result.dependencies, [] );
    } );

    it( 'should return null for component with invalid manifest', () => {
      // Create a temporary component with invalid manifest
      const tempDir = 'test/temp-invalid';
      const manifestPath = path.join( tempDir, 'manifest.json' );
      
      if ( !fs.existsSync( tempDir ) ) {
        fs.mkdirSync( tempDir, { recursive: true } );
      }
      fs.writeFileSync( manifestPath, 'invalid json{' );
      
      try {
        const result = loadComponent( tempDir, 'invalid' );
        assert.strictEqual( result, null );
      } finally {
        // Cleanup
        if ( fs.existsSync( manifestPath ) ) {fs.unlinkSync( manifestPath );}
        if ( fs.existsSync( tempDir ) ) {fs.rmdirSync( tempDir );}
      }
    } );

    it( 'should return null for component with missing name in manifest', () => {
      // Create a temporary component with manifest missing name
      const tempDir = 'test/temp-no-name';
      const manifestPath = path.join( tempDir, 'manifest.json' );
      
      if ( !fs.existsSync( tempDir ) ) {
        fs.mkdirSync( tempDir, { recursive: true } );
      }
      fs.writeFileSync( manifestPath, JSON.stringify( { type: 'test' } ) );
      
      try {
        const result = loadComponent( tempDir, 'no-name' );
        assert.strictEqual( result, null );
      } finally {
        // Cleanup
        if ( fs.existsSync( manifestPath ) ) {fs.unlinkSync( manifestPath );}
        if ( fs.existsSync( tempDir ) ) {fs.rmdirSync( tempDir );}
      }
    } );
  } );

  describe( 'autoGenerateManifest', () => {
    it( 'should generate manifest for component with CSS and JS files', () => {
      const componentPath = 'test/fixtures/default/lib/layouts/components/_partials/button';
      const result = autoGenerateManifest( componentPath, 'button' );
      
      assert.strictEqual( result.name, 'button' );
      assert.strictEqual( result.type, 'auto' );
      assert( result.styles.includes( 'button.css' ) );
      assert( result.scripts.includes( 'button.js' ) );
      assert.deepStrictEqual( result.dependencies, [] );
    } );

    it( 'should generate manifest for component with only CSS file', () => {
      // Create a temporary component with only CSS
      const tempDir = 'test/temp-css-only';
      const cssFile = path.join( tempDir, 'test.css' );
      
      if ( !fs.existsSync( tempDir ) ) {
        fs.mkdirSync( tempDir, { recursive: true } );
      }
      fs.writeFileSync( cssFile, '.test {}' );
      
      try {
        const result = autoGenerateManifest( tempDir, 'test' );
        
        assert.strictEqual( result.name, 'test' );
        assert.strictEqual( result.type, 'auto' );
        assert( result.styles.includes( 'test.css' ) );
        assert.deepStrictEqual( result.scripts, [] );
        assert.deepStrictEqual( result.dependencies, [] );
      } finally {
        // Cleanup
        if ( fs.existsSync( cssFile ) ) {fs.unlinkSync( cssFile );}
        if ( fs.existsSync( tempDir ) ) {fs.rmdirSync( tempDir );}
      }
    } );

    it( 'should generate manifest for component with no asset files', () => {
      // Create a temporary empty component directory
      const tempDir = 'test/temp-empty';
      
      if ( !fs.existsSync( tempDir ) ) {
        fs.mkdirSync( tempDir, { recursive: true } );
      }
      
      try {
        const result = autoGenerateManifest( tempDir, 'empty' );
        
        assert.strictEqual( result.name, 'empty' );
        assert.strictEqual( result.type, 'auto' );
        assert.deepStrictEqual( result.styles, [] );
        assert.deepStrictEqual( result.scripts, [] );
        assert.deepStrictEqual( result.dependencies, [] );
      } finally {
        // Cleanup
        if ( fs.existsSync( tempDir ) ) {fs.rmdirSync( tempDir );}
      }
    } );
  } );

  describe( 'createComponentMap', () => {
    it( 'should create map from component array', () => {
      const components = [
        { name: 'button', styles: [], scripts: [], dependencies: [] },
        { name: 'image', styles: [], scripts: [], dependencies: [] }
      ];
      
      const result = createComponentMap( components );
      
      assert( result instanceof Map );
      assert.strictEqual( result.size, 2 );
      assert( result.has( 'button' ) );
      assert( result.has( 'image' ) );
      assert.strictEqual( result.get( 'button' ).name, 'button' );
    } );

    it( 'should throw error for duplicate component names', () => {
      const components = [
        { name: 'button', styles: [], scripts: [], dependencies: [] },
        { name: 'button', styles: [], scripts: [], dependencies: [] }
      ];
      
      assert.throws( () => {
        createComponentMap( components );
      }, /Duplicate component name: button/ );
    } );

    it( 'should handle empty component array', () => {
      const result = createComponentMap( [] );
      
      assert( result instanceof Map );
      assert.strictEqual( result.size, 0 );
    } );
  } );
} );