/* eslint-env node,mocha */
import assert from 'node:assert';
import { validateDependencies, resolveDependencyOrder } from '../../src/utils/dependency-resolver.js';

describe('Utils - Dependency Resolver', () => {
  describe('validateDependencies', () => {
    it('should return empty array for valid dependencies', () => {
      const componentMap = new Map();
      componentMap.set('button', { name: 'button', dependencies: [] });
      componentMap.set('image', { name: 'image', dependencies: ['button'] });
      
      const result = validateDependencies(componentMap);
      assert.deepStrictEqual(result, []);
    });

    it('should return errors for missing dependencies', () => {
      const componentMap = new Map();
      componentMap.set('banner', { name: 'banner', dependencies: ['button', 'missing'] });
      
      const result = validateDependencies(componentMap);
      assert.strictEqual(result.length, 2);
      assert(result.some(error => error.includes("depends on unknown component 'button'")));
      assert(result.some(error => error.includes("depends on unknown component 'missing'")));
    });

    it('should handle components with no dependencies', () => {
      const componentMap = new Map();
      componentMap.set('button', { name: 'button', dependencies: [] });
      componentMap.set('image', { name: 'image', dependencies: [] });
      
      const result = validateDependencies(componentMap);
      assert.deepStrictEqual(result, []);
    });

    it('should handle empty component map', () => {
      const componentMap = new Map();
      const result = validateDependencies(componentMap);
      assert.deepStrictEqual(result, []);
    });
  });

  describe('resolveDependencyOrder', () => {
    it('should resolve simple dependency order', () => {
      const componentMap = new Map();
      componentMap.set('button', { name: 'button', dependencies: [] });
      componentMap.set('banner', { name: 'banner', dependencies: ['button'] });
      
      const result = resolveDependencyOrder(componentMap);
      
      assert(Array.isArray(result));
      assert.strictEqual(result.length, 2);
      assert(result.indexOf('button') < result.indexOf('banner'));
    });

    it('should resolve complex dependency chains', () => {
      const componentMap = new Map();
      componentMap.set('base', { name: 'base', dependencies: [] });
      componentMap.set('button', { name: 'button', dependencies: ['base'] });
      componentMap.set('form', { name: 'form', dependencies: ['button'] });
      componentMap.set('modal', { name: 'modal', dependencies: ['button'] });
      
      const result = resolveDependencyOrder(componentMap);
      
      assert.strictEqual(result.length, 4);
      assert(result.indexOf('base') < result.indexOf('button'));
      assert(result.indexOf('button') < result.indexOf('form'));
      assert(result.indexOf('button') < result.indexOf('modal'));
    });

    it('should handle components with no dependencies', () => {
      const componentMap = new Map();
      componentMap.set('button', { name: 'button', dependencies: [] });
      componentMap.set('image', { name: 'image', dependencies: [] });
      
      const result = resolveDependencyOrder(componentMap);
      
      assert.strictEqual(result.length, 2);
      assert(result.includes('button'));
      assert(result.includes('image'));
    });

    it('should detect circular dependencies', () => {
      const componentMap = new Map();
      componentMap.set('a', { name: 'a', dependencies: ['b'] });
      componentMap.set('b', { name: 'b', dependencies: ['c'] });
      componentMap.set('c', { name: 'c', dependencies: ['a'] });
      
      assert.throws(() => {
        resolveDependencyOrder(componentMap);
      }, /Circular dependency.*a.*b.*c.*a/);
    });

    it('should detect simple circular dependencies', () => {
      const componentMap = new Map();
      componentMap.set('a', { name: 'a', dependencies: ['b'] });
      componentMap.set('b', { name: 'b', dependencies: ['a'] });
      
      assert.throws(() => {
        resolveDependencyOrder(componentMap);
      }, /Circular dependency.*a.*b/);
    });

    it('should handle self-referencing dependencies', () => {
      const componentMap = new Map();
      componentMap.set('recursive', { name: 'recursive', dependencies: ['recursive'] });
      
      assert.throws(() => {
        resolveDependencyOrder(componentMap);
      }, /Circular dependency.*recursive/);
    });

    it('should handle empty component map', () => {
      const componentMap = new Map();
      const result = resolveDependencyOrder(componentMap);
      assert.deepStrictEqual(result, []);
    });

    it('should handle multiple dependency roots correctly', () => {
      const componentMap = new Map();
      componentMap.set('root1', { name: 'root1', dependencies: [] });
      componentMap.set('root2', { name: 'root2', dependencies: [] });
      componentMap.set('child1', { name: 'child1', dependencies: ['root1'] });
      componentMap.set('child2', { name: 'child2', dependencies: ['root2'] });
      
      const result = resolveDependencyOrder(componentMap);
      
      assert.strictEqual(result.length, 4);
      assert(result.indexOf('root1') < result.indexOf('child1'));
      assert(result.indexOf('root2') < result.indexOf('child2'));
    });
  });
});