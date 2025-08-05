/* eslint-env node,mocha */
import assert from 'node:assert';
import { normalizeOptions, defaults } from '../../src/utils/options.js';

describe('Utils - Options', () => {
  it('should export defaults', () => {
    assert.strictEqual(typeof defaults, 'object');
    assert.strictEqual(defaults.basePath, 'lib/layouts/components/_partials');
    assert.strictEqual(defaults.sectionsPath, 'lib/layouts/components/sections');
    assert.strictEqual(defaults.cssDest, 'assets/components.css');
    assert.strictEqual(defaults.jsDest, 'assets/components.js');
    assert.strictEqual(defaults.postcss.enabled, false);
  });

  it('should normalize undefined options to defaults', () => {
    const result = normalizeOptions();
    assert.deepStrictEqual(result, defaults);
  });

  it('should normalize null options to defaults', () => {
    const result = normalizeOptions(null);
    assert.deepStrictEqual(result, defaults);
  });

  it('should merge custom options with defaults', () => {
    const custom = {
      basePath: 'custom/path',
      cssDest: 'custom.css'
    };
    const result = normalizeOptions(custom);
    
    assert.strictEqual(result.basePath, 'custom/path');
    assert.strictEqual(result.cssDest, 'custom.css');
    assert.strictEqual(result.sectionsPath, defaults.sectionsPath);
    assert.strictEqual(result.jsDest, defaults.jsDest);
  });

  it('should merge partial PostCSS configuration', () => {
    const custom = {
      postcss: {
        enabled: true,
        plugins: ['test-plugin']
      }
    };
    const result = normalizeOptions(custom);
    
    assert.strictEqual(result.postcss.enabled, true);
    assert.deepStrictEqual(result.postcss.plugins, ['test-plugin']);
    assert.deepStrictEqual(result.postcss.options, {});
  });

  it('should handle empty PostCSS configuration', () => {
    const custom = {
      postcss: {}
    };
    const result = normalizeOptions(custom);
    
    assert.strictEqual(result.postcss.enabled, false);
    assert.deepStrictEqual(result.postcss.plugins, []);
    assert.deepStrictEqual(result.postcss.options, {});
  });

  it('should handle null PostCSS configuration', () => {
    const custom = {
      postcss: null
    };
    const result = normalizeOptions(custom);
    
    assert.strictEqual(result.postcss.enabled, false);
    assert.deepStrictEqual(result.postcss.plugins, []);
    assert.deepStrictEqual(result.postcss.options, {});
  });
});