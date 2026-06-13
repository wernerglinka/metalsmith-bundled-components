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

    it('throws on a circular $use reference', () => {
      const componentMap = new Map([
        ['a', { name: 'a', fields: { b: { $use: 'b' } } }],
        ['b', { name: 'b', fields: { a: { $use: 'a' } } }]
      ]);
      assert.throws(() => resolveFields({ start: { $use: 'a' } }, componentMap), /Circular \$use reference/);
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
  });
});
