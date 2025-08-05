/* eslint-env node,mocha */
import assert from 'node:assert';
import { createPostCSSProcessor, processCSSThroughPostCSS } from '../../src/processors/postcss-processor.js';

describe('Processors - PostCSS Processor', () => {
  describe('createPostCSSProcessor', () => {
    it('should return null when PostCSS is disabled', () => {
      const config = { enabled: false };
      const result = createPostCSSProcessor(config);
      assert.strictEqual(result, null);
    });

    it('should create processor when PostCSS is enabled', () => {
      const config = { enabled: true, plugins: [] };
      const result = createPostCSSProcessor(config);
      assert(result !== null);
      assert(typeof result.process === 'function');
    });

    it('should create processor with plugins', () => {
      // Simple mock plugin that follows PostCSS plugin structure
      const mockPlugin = {
        postcssPlugin: 'test-plugin',
        Once() {},
        Declaration() {}
      };

      const config = { 
        enabled: true, 
        plugins: [mockPlugin] 
      };
      const result = createPostCSSProcessor(config);
      assert(result !== null);
      assert(typeof result.process === 'function');
    });

    it('should handle empty plugins array', () => {
      const config = { enabled: true, plugins: [] };
      const result = createPostCSSProcessor(config);
      assert(result !== null);
    });

    it('should handle undefined plugins', () => {
      const config = { enabled: true };
      const result = createPostCSSProcessor(config);
      assert(result !== null);
    });
  });

  describe('processCSSThroughPostCSS', () => {
    it('should return original content when processor is null', async () => {
      const cssContent = '.test { color: red; }';
      const result = await processCSSThroughPostCSS(cssContent, null, 'test.css');
      assert.strictEqual(result, cssContent);
    });

    it('should process CSS with valid processor', async () => {
      const cssContent = '.test { color: red; }';
      const config = { enabled: true, plugins: [] };
      const processor = createPostCSSProcessor(config);
      
      const result = await processCSSThroughPostCSS(cssContent, processor, 'test.css');
      assert(typeof result === 'string');
      // Basic CSS should pass through unchanged with no plugins
      assert(result.includes('color: red'));
    });

    it('should handle processing errors gracefully', async () => {
      const invalidCSS = '.test { color: ; }'; // Invalid CSS
      const config = { enabled: true, plugins: [] };
      const processor = createPostCSSProcessor(config);
      
      // Should not throw, but return original content
      const result = await processCSSThroughPostCSS(invalidCSS, processor, 'invalid.css');
      assert.strictEqual(result, invalidCSS);
    });

    it('should handle empty CSS content', async () => {
      const cssContent = '';
      const config = { enabled: true, plugins: [] };
      const processor = createPostCSSProcessor(config);
      
      const result = await processCSSThroughPostCSS(cssContent, processor, 'empty.css');
      assert.strictEqual(result, '');
    });

    it('should handle whitespace-only CSS content', async () => {
      const cssContent = '   \n  \t  ';
      const config = { enabled: true, plugins: [] };
      const processor = createPostCSSProcessor(config);
      
      const result = await processCSSThroughPostCSS(cssContent, processor, 'whitespace.css');
      assert(typeof result === 'string');
    });
  });
});