/* eslint-env node,mocha */
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { bundleComponents, bundleComponentStyles, bundleComponentScripts } from '../../src/processors/bundle-processor.js';

describe('Processors - Bundle Processor', () => {
  describe('bundleComponentScripts', () => {
    it('should bundle component with JavaScript files', () => {
      const component = {
        name: 'button',
        path: 'test/fixtures/default/lib/layouts/components/_partials/button',
        scripts: ['button.js']
      };
      
      const result = bundleComponentScripts(component);
      
      assert(typeof result === 'string');
      assert(result.includes('// ****** Component: button ******'));
      assert(result.includes('(function() {'));
      assert(result.includes('})();'));
    });

    it('should handle component with no JavaScript files', () => {
      const component = {
        name: 'empty',
        path: '/non/existent/path',
        scripts: []
      };
      
      const result = bundleComponentScripts(component);
      assert.strictEqual(result, null);
    });

    it('should handle component with non-existent JavaScript files', () => {
      const component = {
        name: 'missing',
        path: '/non/existent/path',
        scripts: ['missing.js']
      };
      
      const result = bundleComponentScripts(component);
      assert.strictEqual(result, null);
    });

    it('should handle multiple JavaScript files', () => {
      // Create temporary component with multiple JS files
      const tempDir = 'test/temp-multi-js';
      const jsFile1 = path.join(tempDir, 'script1.js');
      const jsFile2 = path.join(tempDir, 'script2.js');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(jsFile1, 'console.log("script1");');
      fs.writeFileSync(jsFile2, 'console.log("script2");');
      
      try {
        const component = {
          name: 'multi',
          path: tempDir,
          scripts: ['script1.js', 'script2.js']
        };
        
        const result = bundleComponentScripts(component);
        
        assert(typeof result === 'string');
        assert(result.includes('script1'));
        assert(result.includes('script2'));
        // Should have two IIFE wrappers
        assert.strictEqual((result.match(/\(function\(\) \{/g) || []).length, 2);
        assert.strictEqual((result.match(/\}\)\(\);/g) || []).length, 2);
      } finally {
        // Cleanup
        if (fs.existsSync(jsFile1)) fs.unlinkSync(jsFile1);
        if (fs.existsSync(jsFile2)) fs.unlinkSync(jsFile2);
        if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
      }
    });
  });

  describe('bundleComponentStyles', () => {
    it('should bundle component with CSS files', async () => {
      const component = {
        name: 'button',
        path: 'test/fixtures/default/lib/layouts/components/_partials/button',
        styles: ['button.css']
      };
      
      const result = await bundleComponentStyles(component, null);
      
      assert(typeof result === 'string');
      assert(result.includes('/******* Component: button *******/'));
    });

    it('should handle component with no CSS files', async () => {
      const component = {
        name: 'empty',
        path: '/non/existent/path',
        styles: []
      };
      
      const result = await bundleComponentStyles(component, null);
      assert.strictEqual(result, null);
    });

    it('should handle component with non-existent CSS files', async () => {
      const component = {
        name: 'missing',
        path: '/non/existent/path',
        styles: ['missing.css']
      };
      
      const result = await bundleComponentStyles(component, null);
      assert.strictEqual(result, null);
    });

    it('should handle empty CSS files', async () => {
      // Create temporary component with empty CSS file
      const tempDir = 'test/temp-empty-css';
      const cssFile = path.join(tempDir, 'empty.css');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(cssFile, '   \n  '); // whitespace only
      
      try {
        const component = {
          name: 'empty-css',
          path: tempDir,
          styles: ['empty.css']
        };
        
        const result = await bundleComponentStyles(component, null);
        assert.strictEqual(result, null);
      } finally {
        // Cleanup
        if (fs.existsSync(cssFile)) fs.unlinkSync(cssFile);
        if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
      }
    });

    it('should handle multiple CSS files', async () => {
      // Create temporary component with multiple CSS files
      const tempDir = 'test/temp-multi-css';
      const cssFile1 = path.join(tempDir, 'style1.css');
      const cssFile2 = path.join(tempDir, 'style2.css');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(cssFile1, '.style1 { color: red; }');
      fs.writeFileSync(cssFile2, '.style2 { color: blue; }');
      
      try {
        const component = {
          name: 'multi-css',
          path: tempDir,
          styles: ['style1.css', 'style2.css']
        };
        
        const result = await bundleComponentStyles(component, null);
        
        assert(typeof result === 'string');
        assert(result.includes('style1'));
        assert(result.includes('style2'));
        assert(result.includes('/******* Component: multi-css *******/'));
      } finally {
        // Cleanup
        if (fs.existsSync(cssFile1)) fs.unlinkSync(cssFile1);
        if (fs.existsSync(cssFile2)) fs.unlinkSync(cssFile2);
        if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
      }
    });
  });

  describe('bundleComponents', () => {
    it('should bundle components in order', async () => {
      const componentMap = new Map();
      componentMap.set('button', {
        name: 'button',
        path: 'test/fixtures/default/lib/layouts/components/_partials/button',
        styles: ['button.css'],
        scripts: ['button.js']
      });
      componentMap.set('banner', {
        name: 'banner',
        path: 'test/fixtures/default/lib/layouts/components/sections/banner',
        styles: ['banner.css'],
        scripts: ['banner.js']
      });
      
      const buildOrder = ['button', 'banner'];
      const result = await bundleComponents(buildOrder, componentMap, null);
      
      assert(typeof result === 'object');
      assert(typeof result.css === 'string');
      assert(typeof result.js === 'string');
      
      // Check order - button should come before banner
      const cssLines = result.css.split('\n');
      const buttonIndex = cssLines.findIndex(line => line.includes('Component: button'));
      const bannerIndex = cssLines.findIndex(line => line.includes('Component: banner'));
      assert(buttonIndex < bannerIndex);
    });

    it('should handle components with no assets', async () => {
      const componentMap = new Map();
      componentMap.set('empty', {
        name: 'empty',
        path: '/non/existent/path',
        styles: [],
        scripts: []
      });
      
      const buildOrder = ['empty'];
      const result = await bundleComponents(buildOrder, componentMap, null);
      
      assert(typeof result === 'object');
      assert.strictEqual(result.css, null);
      assert.strictEqual(result.js, null);
    });

    it('should handle empty build order', async () => {
      const componentMap = new Map();
      const buildOrder = [];
      const result = await bundleComponents(buildOrder, componentMap, null);
      
      assert(typeof result === 'object');
      assert.strictEqual(result.css, null);
      assert.strictEqual(result.js, null);
    });

    it('should handle mixed components (some with assets, some without)', async () => {
      const componentMap = new Map();
      componentMap.set('button', {
        name: 'button',
        path: 'test/fixtures/default/lib/layouts/components/_partials/button',
        styles: ['button.css'],
        scripts: ['button.js']
      });
      componentMap.set('empty', {
        name: 'empty',
        path: '/non/existent/path',
        styles: [],
        scripts: []
      });
      
      const buildOrder = ['empty', 'button'];
      const result = await bundleComponents(buildOrder, componentMap, null);
      
      assert(typeof result === 'object');
      assert(typeof result.css === 'string');
      assert(typeof result.js === 'string');
      assert(result.css.includes('Component: button'));
      assert(result.js.includes('Component: button'));
    });
  });
});