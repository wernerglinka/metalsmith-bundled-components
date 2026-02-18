import assert from 'node:assert';
import bundledComponents from '../../src/index.js';

describe( 'Plugin Options', () => {
  it( 'should accept default options', () => {
    const pluginInstance = bundledComponents();
    assert.strictEqual( typeof pluginInstance, 'function' );
  } );

  it( 'should accept custom options', () => {
    const customOptions = {
      basePath: 'custom/base/path',
      sectionsPath: 'custom/sections/path',
      cssDest: 'custom/css/path.css',
      jsDest: 'custom/js/path.js'
    };

    const pluginInstance = bundledComponents( customOptions );
    assert.strictEqual( typeof pluginInstance, 'function' );
  } );

  it( 'should accept PostCSS configuration', () => {
    const customOptions = {
      postcss: {
        enabled: true,
        plugins: [],
        options: { map: false }
      }
    };

    const pluginInstance = bundledComponents( customOptions );
    assert.strictEqual( typeof pluginInstance, 'function' );
  } );

  it( 'should merge partial options with defaults', () => {
    // We can't easily test the internal state of options after normalization,
    // but we can verify that the plugin doesn't crash with partial options

    const partialOptions = {
      basePath: 'custom/base/path'
      // Other options should be defaulted
    };

    const pluginInstance = bundledComponents( partialOptions );
    assert.strictEqual( typeof pluginInstance, 'function' );
  } );
} );
