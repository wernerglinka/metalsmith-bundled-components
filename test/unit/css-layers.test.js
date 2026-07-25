/**
 * @fileoverview Unit tests for cascade layer assembly: wrapping component CSS
 * in named sublayers, the layer order statement, and per-component override
 * pickup from the overrides directory.
 */

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  collectOverrides,
  findOverride,
  isWrappable,
  layerOrderStatement,
  wrapInLayer
} from '../../src/utils/css-layers.js';

describe('CSS Layers', () => {
  describe('wrapInLayer()', () => {
    it('nests a stylesheet in the named layer', () => {
      const result = wrapInLayer('components.hero', '.hero { color: red; }');
      assert.match(result, /^@layer components\.hero \{/);
      assert.match(result, /\n\}$/);
      assert.match(result, /\.hero \{ color: red; \}/);
    });

    it('indents the wrapped rules', () => {
      const result = wrapInLayer('components.hero', '.hero {\n  color: red;\n}');
      assert.match(result, /\n {2}\.hero \{/);
      assert.match(result, /\n {4}color: red;/);
    });

    it('leaves blank lines unindented rather than padding them with spaces', () => {
      const result = wrapInLayer('components.hero', '.a { color: red; }\n\n.b { color: blue; }');
      assert.ok(!/\n {2}\n/.test(result), 'blank line should stay empty');
    });

    it('leaves a stylesheet that starts with @import unwrapped, since that would be invalid CSS', () => {
      const css = "@import url('./shared.css');\n.hero { color: red; }";
      assert.equal(wrapInLayer('components.hero', css), css);
    });

    it('leaves a stylesheet that starts with @charset unwrapped', () => {
      const css = '@charset "utf-8";\n.hero { color: red; }';
      assert.equal(wrapInLayer('components.hero', css), css);
    });

    it('still wraps a file that merely mentions the word import in a comment', () => {
      const css = '/* important: the import order matters */\n.hero { color: red; }';
      assert.match(wrapInLayer('components.hero', css), /^@layer components\.hero \{/);
    });
  });

  describe('isWrappable()', () => {
    it('accepts ordinary component CSS', () => {
      assert.equal(isWrappable('.hero { color: red; }'), true);
    });

    it('rejects a stylesheet with a top-level @import', () => {
      assert.equal(isWrappable("@import './a.css';\n.hero {}"), false);
    });
  });

  describe('layerOrderStatement()', () => {
    it('emits the configured order, lowest precedence first', () => {
      assert.equal(
        layerOrderStatement(['tokens', 'base', 'components', 'site']),
        '@layer tokens, base, components, site;'
      );
    });

    it('emits nothing for an empty order', () => {
      assert.equal(layerOrderStatement([]), '');
      assert.equal(layerOrderStatement(undefined), '');
    });
  });

  describe('override pickup', () => {
    let root;
    const layers = { overridesPath: 'lib/overrides' };

    before(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'css-layers-'));
      const heroDir = path.join(root, 'lib/overrides/hero');
      fs.mkdirSync(heroDir, { recursive: true });
      fs.writeFileSync(path.join(heroDir, 'hero.css'), '.hero { --hero-gap: var(--space-l); }\n');
      // A directory whose file is named for a different component is not a match.
      const strayDir = path.join(root, 'lib/overrides/banner');
      fs.mkdirSync(strayDir, { recursive: true });
      fs.writeFileSync(path.join(strayDir, 'other.css'), '.banner {}\n');
    });

    after(() => {
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('finds an override that follows the naming convention', () => {
      assert.ok(findOverride(root, 'lib/overrides', 'hero'));
    });

    it('returns null for a component with no override', () => {
      assert.equal(findOverride(root, 'lib/overrides', 'footer'), null);
    });

    it('ignores a file that does not match its directory name', () => {
      assert.equal(findOverride(root, 'lib/overrides', 'banner'), null);
    });

    it('collects overrides only for the components in the build', () => {
      const found = collectOverrides(['hero', 'footer'], root, layers);
      assert.deepEqual(
        found.map((entry) => entry.name),
        ['hero']
      );
      assert.match(found[0].css, /--hero-gap/);
    });

    it('does not collect an override twice when a component is bundled from several files', () => {
      const found = collectOverrides(['hero', 'hero'], root, layers);
      assert.equal(found.length, 1);
    });

    it('returns nothing when the build uses no components with overrides', () => {
      assert.deepEqual(collectOverrides(['footer'], root, layers), []);
    });
  });
});
