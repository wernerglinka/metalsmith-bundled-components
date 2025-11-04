import { strict as assert } from 'assert';
import { extractComponentName, parseTemplateFile, detectUsedComponents } from '../../src/utils/template-parser.js';

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
  } );
} );
