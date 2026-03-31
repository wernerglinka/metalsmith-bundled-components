import { strict as assert } from 'assert';
import { extractComponentName, parseTemplateFile, detectUsedComponents, collectSectionTypes } from '../../src/utils/template-parser.js';

describe('Template Parser', () => {
  describe('extractComponentName()', () => {
    it('should extract component name from _partials path', () => {
      const result = extractComponentName(
        'components/_partials/button/button.njk',
        [ '_partials', 'sections' ]
      );
      assert.equal( result, 'button' );
    } );

    it('should extract component name from sections path', () => {
      const result = extractComponentName(
        'components/sections/hero/hero.njk',
        [ '_partials', 'sections' ]
      );
      assert.equal( result, 'hero' );
    } );

    it('should extract component name from path without components prefix', () => {
      const result = extractComponentName(
        '_partials/ctas/ctas.njk',
        [ '_partials', 'sections' ]
      );
      assert.equal( result, 'ctas' );
    } );

    it('should return null for non-component paths', () => {
      const result = extractComponentName(
        'templates/page.njk',
        [ '_partials', 'sections' ]
      );
      assert.equal( result, null );
    } );

    it('should handle deeply nested component paths', () => {
      const result = extractComponentName(
        'lib/layouts/components/_partials/button/button.njk',
        [ '_partials', 'sections' ]
      );
      assert.equal( result, 'button' );
    } );
  } );

  describe('parseTemplateFile()', () => {
    it('should parse single component import', () => {
      const template = `
        {% from "components/_partials/button/button.njk" import button %}
      `;
      const result = parseTemplateFile( template, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should parse multiple component imports', () => {
      const template = `
        {% from "components/_partials/button/button.njk" import button %}
        {% from "components/sections/hero/hero.njk" import hero %}
        {% from "components/_partials/icon/icon.njk" import icon %}
      `;
      const result = parseTemplateFile( template, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ].sort(), [ 'button', 'hero', 'icon' ].sort() );
    } );

    it('should handle single quotes', () => {
      const template = `
        {% from 'components/_partials/button/button.njk' import button %}
      `;
      const result = parseTemplateFile( template, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should handle multiple imports from same component', () => {
      const template = `
        {% from "components/_partials/button/button.njk" import button, iconButton %}
      `;
      const result = parseTemplateFile( template, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should deduplicate same component imported multiple times', () => {
      const template = `
        {% from "components/_partials/button/button.njk" import button %}
        {% from "components/_partials/button/button.njk" import iconButton %}
      `;
      const result = parseTemplateFile( template, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should ignore non-component imports', () => {
      const template = `
        {% from "templates/macros.njk" import something %}
        {% from "components/_partials/button/button.njk" import button %}
      `;
      const result = parseTemplateFile( template, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should handle templates with no imports', () => {
      const template = `
        <html>
          <body>No imports here</body>
        </html>
      `;
      const result = parseTemplateFile( template, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [] );
    } );

    it('should handle compact import syntax (no spaces)', () => {
      const template = `{%from"components/_partials/button/button.njk"import button%}`;
      const result = parseTemplateFile( template, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should handle imports with extra whitespace', () => {
      const template = `
        {%   from   "components/_partials/button/button.njk"   import   button   %}
      `;
      const result = parseTemplateFile( template, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );
  } );

  describe('detectUsedComponents()', () => {
    it('should detect components across multiple files', () => {
      const files = {
        'index.html': {
          contents: Buffer.from( '{% from "components/_partials/button/button.njk" import button %}' )
        },
        'about.html': {
          contents: Buffer.from( '{% from "components/sections/hero/hero.njk" import hero %}' )
        }
      };

      const result = detectUsedComponents( files, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ].sort(), [ 'button', 'hero' ].sort() );
    } );

    it('should only process .njk and .html files', () => {
      const files = {
        'index.njk': {
          contents: Buffer.from( '{% from "components/_partials/button/button.njk" import button %}' )
        },
        'about.html': {
          contents: Buffer.from( '{% from "components/sections/hero/hero.njk" import hero %}' )
        },
        'data.json': {
          contents: Buffer.from( '{% from "components/_partials/icon/icon.njk" import icon %}' )
        },
        'styles.css': {
          contents: Buffer.from( '{% from "components/_partials/icon/icon.njk" import icon %}' )
        }
      };

      const result = detectUsedComponents( files, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ].sort(), [ 'button', 'hero' ].sort() );
    } );

    it('should handle files without contents', () => {
      const files = {
        'index.html': {
          contents: Buffer.from( '{% from "components/_partials/button/button.njk" import button %}' )
        },
        'empty.html': {}
      };

      const result = detectUsedComponents( files, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should handle string contents (not Buffer)', () => {
      const files = {
        'index.html': {
          contents: '{% from "components/_partials/button/button.njk" import button %}'
        }
      };

      const result = detectUsedComponents( files, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should deduplicate components across files', () => {
      const files = {
        'index.html': {
          contents: Buffer.from( '{% from "components/_partials/button/button.njk" import button %}' )
        },
        'about.html': {
          contents: Buffer.from( '{% from "components/_partials/button/button.njk" import button %}' )
        }
      };

      const result = detectUsedComponents( files, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [ 'button' ] );
    } );

    it('should return empty set when no template files exist', () => {
      const files = {
        'data.json': {
          contents: Buffer.from( '{}' )
        }
      };

      const result = detectUsedComponents( files, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [] );
    } );

    it('should detect sectionType from top-level sections[] in frontmatter', () => {
      const files = {
        'index.html': {
          contents: Buffer.from( '' ),
          sections: [
            { sectionType: 'hero' },
            { sectionType: 'text-media' }
          ]
        }
      };

      const result = detectUsedComponents( files, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ].sort(), [ 'hero', 'text-media' ].sort() );
    } );

    it('should detect sectionType nested inside a wrapper component', () => {
      const files = {
        'index.html': {
          contents: Buffer.from( '' ),
          sections: [
            {
              sectionType: 'tabbed-content',
              tabs: [
                { pane: { sectionType: 'image-grid' } }
              ]
            }
          ]
        }
      };

      const result = detectUsedComponents( files, [ '_partials', 'sections' ] );
      assert.ok( result.has( 'tabbed-content' ), 'should find the wrapper sectionType' );
      assert.ok( result.has( 'image-grid' ), 'should find the nested pane sectionType' );
    } );

    it('should detect multiple pane sectionType values at depth', () => {
      const files = {
        'index.html': {
          contents: Buffer.from( '' ),
          sections: [
            {
              sectionType: 'tabbed-content',
              tabs: [
                { pane: { sectionType: 'image-grid' } },
                { pane: { sectionType: 'text-block' } }
              ]
            }
          ]
        }
      };

      const result = detectUsedComponents( files, [ '_partials', 'sections' ] );
      assert.ok( result.has( 'tabbed-content' ) );
      assert.ok( result.has( 'image-grid' ) );
      assert.ok( result.has( 'text-block' ) );
    } );

    it('should not produce false positives from Metalsmith internals', () => {
      const files = {
        'data.html': {
          contents: Buffer.from( '<p>No sections here</p>' ),
          stats: { size: 42 },
          mode: '0644'
        }
      };

      const result = detectUsedComponents( files, [ '_partials', 'sections' ] );
      assert.deepEqual( [ ...result ], [] );
    } );
  } );

  describe('collectSectionTypes()', () => {
    it('should collect sectionType from a flat array of section objects', () => {
      const result = new Set();
      collectSectionTypes( [ { sectionType: 'hero' }, { sectionType: 'footer' } ], result );
      assert.deepEqual( [ ...result ].sort(), [ 'footer', 'hero' ] );
    } );

    it('should collect sectionType values nested at arbitrary depth', () => {
      const result = new Set();
      collectSectionTypes(
        { tabs: [ { pane: { sectionType: 'image-grid' } } ] },
        result
      );
      assert.deepEqual( [ ...result ], [ 'image-grid' ] );
    } );

    it('should deduplicate repeated sectionType values', () => {
      const result = new Set();
      collectSectionTypes(
        [ { sectionType: 'hero' }, { sectionType: 'hero' } ],
        result
      );
      assert.deepEqual( [ ...result ], [ 'hero' ] );
    } );

    it('should ignore non-string sectionType values', () => {
      const result = new Set();
      collectSectionTypes( { sectionType: 42 }, result );
      assert.deepEqual( [ ...result ], [] );
    } );

    it('should return without error for null, undefined, and primitives', () => {
      const result = new Set();
      assert.doesNotThrow( () => {
        collectSectionTypes( null, result );
        collectSectionTypes( undefined, result );
        collectSectionTypes( 'a string', result );
        collectSectionTypes( 99, result );
      } );
      assert.deepEqual( [ ...result ], [] );
    } );
  } );
} );
