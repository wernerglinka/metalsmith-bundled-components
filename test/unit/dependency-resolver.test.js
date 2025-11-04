import { strict as assert } from 'assert';
import { resolveAllDependencies, filterNeededComponents } from '../../src/utils/dependency-resolver.js';

describe('Dependency Resolver', () => {
  describe('resolveAllDependencies()', () => {
    it('should return only used components when they have no dependencies', () => {
      const used = new Set( [ 'button' ] );
      const componentMap = new Map( [
        [ 'button', { name: 'button', requires: [] } ]
      ] );

      const result = resolveAllDependencies( used, componentMap );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should resolve single-level dependencies', () => {
      const used = new Set( [ 'hero' ] );
      const componentMap = new Map( [
        [ 'hero', { name: 'hero', requires: [ 'button' ] } ],
        [ 'button', { name: 'button', requires: [] } ]
      ] );

      const result = resolveAllDependencies( used, componentMap );
      assert.deepEqual( [ ...result ].sort(), [ 'button', 'hero' ].sort() );
    } );

    it('should resolve multi-level (transitive) dependencies', () => {
      const used = new Set( [ 'hero' ] );
      const componentMap = new Map( [
        [ 'hero', { name: 'hero', requires: [ 'button' ] } ],
        [ 'button', { name: 'button', requires: [ 'icon' ] } ],
        [ 'icon', { name: 'icon', requires: [] } ]
      ] );

      const result = resolveAllDependencies( used, componentMap );
      assert.deepEqual( [ ...result ].sort(), [ 'button', 'hero', 'icon' ].sort() );
    } );

    it('should handle multiple direct dependencies', () => {
      const used = new Set( [ 'hero' ] );
      const componentMap = new Map( [
        [ 'hero', { name: 'hero', requires: [ 'button', 'image', 'icon' ] } ],
        [ 'button', { name: 'button', requires: [] } ],
        [ 'image', { name: 'image', requires: [] } ],
        [ 'icon', { name: 'icon', requires: [] } ]
      ] );

      const result = resolveAllDependencies( used, componentMap );
      assert.deepEqual( [ ...result ].sort(), [ 'button', 'hero', 'icon', 'image' ].sort() );
    } );

    it('should deduplicate shared dependencies', () => {
      const used = new Set( [ 'hero', 'banner' ] );
      const componentMap = new Map( [
        [ 'hero', { name: 'hero', requires: [ 'button', 'icon' ] } ],
        [ 'banner', { name: 'banner', requires: [ 'button', 'image' ] } ],
        [ 'button', { name: 'button', requires: [] } ],
        [ 'icon', { name: 'icon', requires: [] } ],
        [ 'image', { name: 'image', requires: [] } ]
      ] );

      const result = resolveAllDependencies( used, componentMap );
      assert.deepEqual( [ ...result ].sort(), [ 'banner', 'button', 'hero', 'icon', 'image' ].sort() );
    } );

    it('should support legacy dependencies property', () => {
      const used = new Set( [ 'hero' ] );
      const componentMap = new Map( [
        [ 'hero', { name: 'hero', dependencies: [ 'button' ] } ], // legacy 'dependencies'
        [ 'button', { name: 'button', dependencies: [] } ]
      ] );

      const result = resolveAllDependencies( used, componentMap );
      assert.deepEqual( [ ...result ].sort(), [ 'button', 'hero' ].sort() );
    } );

    it('should handle components with neither requires nor dependencies', () => {
      const used = new Set( [ 'button' ] );
      const componentMap = new Map( [
        [ 'button', { name: 'button' } ] // no requires or dependencies property
      ] );

      const result = resolveAllDependencies( used, componentMap );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should skip missing components gracefully', () => {
      const used = new Set( [ 'hero' ] );
      const componentMap = new Map( [
        [ 'hero', { name: 'hero', requires: [ 'missing' ] } ]
        // 'missing' component not in map
      ] );

      const result = resolveAllDependencies( used, componentMap );
      // Should include hero and missing (even though missing doesn't exist)
      // The validation step will catch this later
      assert.deepEqual( [ ...result ].sort(), [ 'hero', 'missing' ].sort() );
    } );

    it('should handle empty used components set', () => {
      const used = new Set();
      const componentMap = new Map( [
        [ 'button', { name: 'button', requires: [] } ]
      ] );

      const result = resolveAllDependencies( used, componentMap );
      assert.deepEqual( [ ...result ], [] );
    } );

    it('should handle complex diamond dependency graph', () => {
      //     hero
      //    /    \
      //  button  image
      //    \    /
      //     icon
      const used = new Set( [ 'hero' ] );
      const componentMap = new Map( [
        [ 'hero', { name: 'hero', requires: [ 'button', 'image' ] } ],
        [ 'button', { name: 'button', requires: [ 'icon' ] } ],
        [ 'image', { name: 'image', requires: [ 'icon' ] } ],
        [ 'icon', { name: 'icon', requires: [] } ]
      ] );

      const result = resolveAllDependencies( used, componentMap );
      assert.deepEqual( [ ...result ].sort(), [ 'button', 'hero', 'icon', 'image' ].sort() );
    } );
  } );

  describe('filterNeededComponents()', () => {
    it('should filter components to only needed ones', () => {
      const allComponents = [
        { name: 'button', path: '/button' },
        { name: 'icon', path: '/icon' },
        { name: 'unused', path: '/unused' }
      ];
      const needed = new Set( [ 'button', 'icon' ] );

      const result = filterNeededComponents( allComponents, needed );
      assert.equal( result.length, 2 );
      assert.deepEqual( result.map( c => c.name ).sort(), [ 'button', 'icon' ].sort() );
    } );

    it('should return empty array when no components are needed', () => {
      const allComponents = [
        { name: 'button', path: '/button' },
        { name: 'icon', path: '/icon' }
      ];
      const needed = new Set();

      const result = filterNeededComponents( allComponents, needed );
      assert.deepEqual( result, [] );
    } );

    it('should preserve original component objects', () => {
      const allComponents = [
        { name: 'button', path: '/button', styles: [ 'button.css' ] },
        { name: 'unused', path: '/unused' }
      ];
      const needed = new Set( [ 'button' ] );

      const result = filterNeededComponents( allComponents, needed );
      assert.equal( result.length, 1 );
      assert.deepEqual( result[ 0 ], allComponents[ 0 ] );
    } );

    it('should handle when all components are needed', () => {
      const allComponents = [
        { name: 'button', path: '/button' },
        { name: 'icon', path: '/icon' }
      ];
      const needed = new Set( [ 'button', 'icon' ] );

      const result = filterNeededComponents( allComponents, needed );
      assert.equal( result.length, 2 );
      assert.deepEqual( result, allComponents );
    } );
  } );
} );
