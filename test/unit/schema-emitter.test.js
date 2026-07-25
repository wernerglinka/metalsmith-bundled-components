import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { buildComponentsSchema, resolveFields } from '../../src/utils/schema-emitter.js';

describe('Schema Emitter', () => {
  describe('resolveFields()', () => {
    it('returns leaf fields unchanged', () => {
      const fields = {
        title: { widget: 'text', label: 'Title', default: '' }
      };
      const result = resolveFields(fields, new Map());
      assert.deepEqual(result, fields);
    });

    it('recurses into plain groups', () => {
      const fields = {
        containerFields: {
          inContainer: { widget: 'checkbox', label: 'Constrain width', default: false }
        }
      };
      const result = resolveFields(fields, new Map());
      assert.equal(result.containerFields.inContainer.widget, 'checkbox');
    });

    it('expands a $use reference to the referenced component fields', () => {
      const componentMap = new Map([
        [
          'text',
          {
            name: 'text',
            fields: {
              title: { widget: 'text', label: 'Title', default: '' },
              prose: { widget: 'markdown', label: 'Body', default: '' }
            }
          }
        ]
      ]);
      const result = resolveFields({ text: { $use: 'text' } }, componentMap);
      assert.deepEqual(result.text, {
        title: { widget: 'text', label: 'Title', default: '' },
        prose: { widget: 'markdown', label: 'Body', default: '' }
      });
    });

    it('deep-merges sibling overrides onto a $use reference', () => {
      const componentMap = new Map([
        [
          'text',
          {
            name: 'text',
            fields: {
              titleTag: { widget: 'select', label: 'Title level', enum: ['h1', 'h2'], default: 'h2' },
              title: { widget: 'text', label: 'Title', default: '' }
            }
          }
        ]
      ]);
      const result = resolveFields({ text: { $use: 'text', titleTag: { default: 'h1' } } }, componentMap);
      // Override changes only the default; the rest of the field is preserved.
      assert.equal(result.text.titleTag.default, 'h1');
      assert.equal(result.text.titleTag.widget, 'select');
      assert.deepEqual(result.text.titleTag.enum, ['h1', 'h2']);
      assert.equal(result.text.title.label, 'Title');
    });

    it('resolves transitive $use (a partial that uses another partial)', () => {
      const componentMap = new Map([
        ['button', { name: 'button', fields: { label: { widget: 'text', label: 'Button label', default: '' } } }],
        ['ctas', { name: 'ctas', fields: { primary: { $use: 'button' } } }]
      ]);
      const result = resolveFields({ ctas: { $use: 'ctas' } }, componentMap);
      assert.deepEqual(result.ctas.primary, { label: { widget: 'text', label: 'Button label', default: '' } });
    });

    it('resolves $use inside an array widget items tree', () => {
      const componentMap = new Map([
        ['button', { name: 'button', fields: { label: { widget: 'text', label: 'Button label', default: '' } } }]
      ]);
      const fields = {
        ctas: { widget: 'array', label: 'CTAs', items: { button: { $use: 'button' } } }
      };
      const result = resolveFields(fields, componentMap);
      assert.equal(result.ctas.widget, 'array');
      assert.deepEqual(result.ctas.items.button, { label: { widget: 'text', label: 'Button label', default: '' } });
    });

    it('throws on an unknown $use target', () => {
      assert.throws(() => resolveFields({ x: { $use: 'missing' } }, new Map()), /unknown component "missing"/);
    });

    it('throws on a circular reference', () => {
      const componentMap = new Map([
        ['a', { name: 'a', fields: { b: { $use: 'b' } } }],
        ['b', { name: 'b', fields: { a: { $use: 'a' } } }]
      ]);
      assert.throws(() => resolveFields({ start: { $use: 'a' } }, componentMap), /Circular reference/);
    });

    it('resolves a $use whose target fields are a single array field', () => {
      const componentMap = new Map([
        [
          'ctas',
          {
            name: 'ctas',
            fields: {
              widget: 'array',
              label: 'Call to action buttons',
              items: { url: { widget: 'text', label: 'URL', default: '' } }
            }
          }
        ]
      ]);
      const result = resolveFields({ ctas: { $use: 'ctas' } }, componentMap);
      assert.equal(result.ctas.widget, 'array');
      assert.equal(result.ctas.items.url.widget, 'text');
    });

    it('spreads $extends partials into the current level', () => {
      const componentMap = new Map([
        [
          'commons',
          {
            name: 'commons',
            fields: {
              isDisabled: { widget: 'checkbox', label: 'Disable section', default: false },
              containerFields: {
                inContainer: { widget: 'checkbox', label: 'Constrain width', default: true }
              }
            }
          }
        ]
      ]);
      const result = resolveFields(
        {
          title: { widget: 'text', label: 'Title', default: '' },
          $extends: ['commons']
        },
        componentMap
      );
      // Own key plus the spread commons keys, all at the same level.
      assert.deepEqual(Object.keys(result).sort(), ['containerFields', 'isDisabled', 'title']);
      assert.equal(result.containerFields.inContainer.default, true);
    });

    it('throws when a $extends target resolves to a leaf instead of a group', () => {
      const componentMap = new Map([['ctas', { name: 'ctas', fields: { widget: 'array', items: {} } }]]);
      assert.throws(() => resolveFields({ $extends: ['ctas'] }, componentMap), /must resolve to a field group/);
    });
  });

  describe('buildComponentsSchema()', () => {
    it('emits only sections that declare a fields block', () => {
      const componentMap = new Map([
        ['text', { name: 'text', fields: { title: { widget: 'text', label: 'Title', default: '' } } }]
      ]);
      const sectionComponents = [
        { name: 'banner', fields: { text: { $use: 'text' } } },
        { name: 'legacy' } // no fields block yet
      ];
      const schema = buildComponentsSchema(sectionComponents, componentMap);
      assert.deepEqual(Object.keys(schema), ['banner']);
      assert.equal(schema.banner.name, 'banner');
      assert.equal(schema.banner.fields.text.title.widget, 'text');
    });

    it('returns an empty object when no section has fields', () => {
      const schema = buildComponentsSchema([{ name: 'hero' }], new Map());
      assert.deepEqual(schema, {});
    });

    it('skips abstract components even when they declare fields', () => {
      const componentMap = new Map();
      const sectionComponents = [
        {
          name: 'commons',
          abstract: true,
          fields: { isDisabled: { widget: 'checkbox', label: 'Disable', default: false } }
        },
        { name: 'banner', fields: { title: { widget: 'text', label: 'Title', default: '' } } }
      ];
      const schema = buildComponentsSchema(sectionComponents, componentMap);
      assert.deepEqual(Object.keys(schema), ['banner']);
    });

    it('skips a section composing a partial that has no fields block yet', () => {
      // A site partway through migration: the section was updated, the
      // partial it composes was not. Incremental migration is the documented
      // promise, so this must not fail the build.
      const componentMap = new Map([['text', { name: 'text' }]]);
      const sectionComponents = [
        { name: 'banner', fields: { text: { $use: 'text' } } },
        { name: 'hero', fields: { title: { widget: 'text', label: 'Title', default: '' } } }
      ];
      const schema = buildComponentsSchema(sectionComponents, componentMap);
      assert.deepEqual(Object.keys(schema), ['hero']);
    });

    it('reports each skipped section and the reference that caused it', () => {
      const componentMap = new Map([['text', { name: 'text' }]]);
      const sectionComponents = [{ name: 'banner', fields: { text: { $use: 'text' } } }];
      const skipped = [];
      buildComponentsSchema(sectionComponents, componentMap, (section, ref) => {
        skipped.push([section, ref]);
      });
      assert.deepEqual(skipped, [['banner', 'text']]);
    });

    it('still throws on an unknown reference, which is an authoring error', () => {
      const sectionComponents = [{ name: 'banner', fields: { text: { $use: 'nope' } } }];
      assert.throws(() => buildComponentsSchema(sectionComponents, new Map()), /unknown component "nope"/);
    });

    it('still throws on a circular reference', () => {
      const componentMap = new Map([
        ['a', { name: 'a', fields: { b: { $use: 'b' } } }],
        ['b', { name: 'b', fields: { a: { $use: 'a' } } }]
      ]);
      const sectionComponents = [{ name: 'banner', fields: { a: { $use: 'a' } } }];
      assert.throws(() => buildComponentsSchema(sectionComponents, componentMap), /Circular reference/);
    });
  });
});
