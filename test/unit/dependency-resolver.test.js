import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  filterNeededComponents,
  resolveAllDependencies,
  sortByDependencyOrder
} from '../../src/utils/dependency-resolver.js';

describe('Dependency Resolver', () => {
  describe('resolveAllDependencies()', () => {
    it('should return only used components when they have no dependencies', () => {
      const used = new Set(['button']);
      const componentMap = new Map([['button', { name: 'button', requires: [] }]]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepEqual([...result], ['button']);
    });

    it('should resolve single-level dependencies', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button'] }],
        ['button', { name: 'button', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepEqual([...result].sort(), ['button', 'hero'].sort());
    });

    it('should resolve multi-level (transitive) dependencies', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button'] }],
        ['button', { name: 'button', requires: ['icon'] }],
        ['icon', { name: 'icon', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepEqual([...result].sort(), ['button', 'hero', 'icon'].sort());
    });

    it('should handle multiple direct dependencies', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button', 'image', 'icon'] }],
        ['button', { name: 'button', requires: [] }],
        ['image', { name: 'image', requires: [] }],
        ['icon', { name: 'icon', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepEqual([...result].sort(), ['button', 'hero', 'icon', 'image'].sort());
    });

    it('should deduplicate shared dependencies', () => {
      const used = new Set(['hero', 'banner']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button', 'icon'] }],
        ['banner', { name: 'banner', requires: ['button', 'image'] }],
        ['button', { name: 'button', requires: [] }],
        ['icon', { name: 'icon', requires: [] }],
        ['image', { name: 'image', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepEqual([...result].sort(), ['banner', 'button', 'hero', 'icon', 'image'].sort());
    });

    it('should support legacy dependencies property', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', dependencies: ['button'] }], // legacy 'dependencies'
        ['button', { name: 'button', dependencies: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepEqual([...result].sort(), ['button', 'hero'].sort());
    });

    it('should handle components with neither requires nor dependencies', () => {
      const used = new Set(['button']);
      const componentMap = new Map([
        ['button', { name: 'button' }] // no requires or dependencies property
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepEqual([...result], ['button']);
    });

    it('should skip missing components gracefully', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['missing'] }]
        // 'missing' component not in map
      ]);

      const result = resolveAllDependencies(used, componentMap);
      // Should include hero and missing (even though missing doesn't exist)
      // The validation step will catch this later
      assert.deepEqual([...result].sort(), ['hero', 'missing'].sort());
    });

    it('should handle empty used components set', () => {
      const used = new Set();
      const componentMap = new Map([['button', { name: 'button', requires: [] }]]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepEqual([...result], []);
    });

    it('should handle complex diamond dependency graph', () => {
      //     hero
      //    /    \
      //  button  image
      //    \    /
      //     icon
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button', 'image'] }],
        ['button', { name: 'button', requires: ['icon'] }],
        ['image', { name: 'image', requires: ['icon'] }],
        ['icon', { name: 'icon', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepEqual([...result].sort(), ['button', 'hero', 'icon', 'image'].sort());
    });
  });

  describe('filterNeededComponents()', () => {
    it('should filter components to only needed ones', () => {
      const allComponents = [
        { name: 'button', path: '/button' },
        { name: 'icon', path: '/icon' },
        { name: 'unused', path: '/unused' }
      ];
      const needed = new Set(['button', 'icon']);

      const result = filterNeededComponents(allComponents, needed);
      assert.equal(result.length, 2);
      assert.deepEqual(result.map((c) => c.name).sort(), ['button', 'icon'].sort());
    });

    it('should return empty array when no components are needed', () => {
      const allComponents = [
        { name: 'button', path: '/button' },
        { name: 'icon', path: '/icon' }
      ];
      const needed = new Set();

      const result = filterNeededComponents(allComponents, needed);
      assert.deepEqual(result, []);
    });

    it('should preserve original component objects', () => {
      const allComponents = [
        { name: 'button', path: '/button', styles: ['button.css'] },
        { name: 'unused', path: '/unused' }
      ];
      const needed = new Set(['button']);

      const result = filterNeededComponents(allComponents, needed);
      assert.equal(result.length, 1);
      assert.deepEqual(result[0], allComponents[0]);
    });

    it('should handle when all components are needed', () => {
      const allComponents = [
        { name: 'button', path: '/button' },
        { name: 'icon', path: '/icon' }
      ];
      const needed = new Set(['button', 'icon']);

      const result = filterNeededComponents(allComponents, needed);
      assert.equal(result.length, 2);
      assert.deepEqual(result, allComponents);
    });
  });
  describe('sortByDependencyOrder()', () => {
    it('places a dependency before its dependent even when the input order is inverted', () => {
      // "artwork" sorts before "commons" alphabetically but requires it
      const components = [
        { name: 'artwork', requires: ['commons'] },
        { name: 'commons', requires: [] }
      ];

      const result = sortByDependencyOrder(components).map((c) => c.name);
      assert.deepEqual(result, ['commons', 'artwork']);
    });

    it('keeps the incoming order for components without requirement edges', () => {
      const components = [{ name: 'beta' }, { name: 'alpha' }, { name: 'gamma' }];

      const result = sortByDependencyOrder(components).map((c) => c.name);
      assert.deepEqual(result, ['beta', 'alpha', 'gamma']);
    });

    it('orders transitive chains dependency-first', () => {
      const components = [
        { name: 'hero', requires: ['button'] },
        { name: 'button', requires: ['icon'] },
        { name: 'icon', requires: [] }
      ];

      const result = sortByDependencyOrder(components).map((c) => c.name);
      assert.deepEqual(result, ['icon', 'button', 'hero']);
    });

    it('supports the legacy dependencies key', () => {
      const components = [
        { name: 'alert', dependencies: ['banner'] },
        { name: 'banner', dependencies: [] }
      ];

      const result = sortByDependencyOrder(components).map((c) => c.name);
      assert.deepEqual(result, ['banner', 'alert']);
    });

    it('ignores requirements that are not in the component list', () => {
      const components = [{ name: 'hero', requires: ['missing'] }, { name: 'button' }];

      const result = sortByDependencyOrder(components).map((c) => c.name);
      assert.deepEqual(result, ['hero', 'button']);
    });

    it('tolerates requirement cycles without throwing', () => {
      const components = [
        { name: 'a', requires: ['b'] },
        { name: 'b', requires: ['a'] }
      ];

      const result = sortByDependencyOrder(components).map((c) => c.name);
      assert.equal(result.length, 2);
      assert.deepEqual([...result].sort(), ['a', 'b']);
    });

    it('returns a new array and leaves the input untouched', () => {
      const components = [{ name: 'artwork', requires: ['commons'] }, { name: 'commons' }];
      const snapshot = components.map((c) => c.name);

      const result = sortByDependencyOrder(components);
      assert.notEqual(result, components);
      assert.deepEqual(
        components.map((c) => c.name),
        snapshot
      );
    });
  });
});
