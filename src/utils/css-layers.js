import fs from 'node:fs';
import path from 'node:path';

/**
 * Cascade layer assembly.
 *
 * Component CSS and site overrides are wrapped in native `@layer` blocks so
 * precedence is decided by layer order rather than by specificity or by the
 * accident of concatenation order. A site's override always wins over the
 * canon component it overrides, however loosely it is written, and canon
 * component files never have to be edited in place.
 *
 * The layer names are nested: a component's rules land in
 * `components.<name>`, its override in `site.<name>`. The sublayer inherits
 * the parent layer's precedence, and devtools show which component a rule
 * came from.
 *
 * Only assembled CSS is wrapped. The main entry is hand-authored and stays
 * exactly as written, which is where the site declares its own `@layer`
 * blocks if it wants them.
 */

/**
 * Whether a stylesheet can legally be nested inside an `@layer` block.
 *
 * `@import` and `@charset` are only valid at the top of a stylesheet, so a
 * file using either cannot be wrapped without producing invalid CSS. Such a
 * file is emitted unwrapped, which costs it layer precedence but keeps the
 * bundle valid.
 *
 * @param {string} css - Stylesheet contents
 * @returns {boolean} True when the file can be wrapped
 */
const isWrappable = (css) => !/^\s*@(import|charset)\b/m.test(css);

/**
 * Indent a block by two spaces so the emitted bundle stays readable when it
 * is not minified.
 *
 * @param {string} css - Stylesheet contents
 * @returns {string} Indented contents
 */
const indent = (css) =>
  css
    .split('\n')
    .map((line) => (line.trim() === '' ? line : `  ${line}`))
    .join('\n');

/**
 * Wrap a stylesheet in a named layer.
 *
 * @param {string} layerName - Fully qualified layer name, e.g. "components.hero"
 * @param {string} css - Stylesheet contents
 * @returns {string} The wrapped stylesheet, or the original when it cannot be wrapped
 */
function wrapInLayer(layerName, css) {
  if (!isWrappable(css)) {
    return css;
  }
  return `@layer ${layerName} {\n${indent(css.trimEnd())}\n}`;
}

/**
 * The `@layer` statement that fixes precedence for the whole bundle.
 *
 * Emitting it up front means order is decided by configuration rather than by
 * which component happened to be concatenated first.
 *
 * @param {string[]} order - Layer names, lowest precedence first
 * @returns {string} The statement, or an empty string when there is no order
 */
function layerOrderStatement(order) {
  return order && order.length > 0 ? `@layer ${order.join(', ')};` : '';
}

/**
 * Find a component's override file.
 *
 * The convention is one directory per component, mirroring how components
 * themselves are laid out: `<overridesPath>/<name>/<name>.css`.
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} overridesPath - Overrides directory, relative to the project root
 * @param {string} componentName - Component to look up
 * @returns {string|null} Absolute path to the override file, or null when absent
 */
function findOverride(projectRoot, overridesPath, componentName) {
  const candidate = path.resolve(projectRoot, overridesPath, componentName, `${componentName}.css`);
  return fs.existsSync(candidate) ? candidate : null;
}

/**
 * Collect the override files for the components in this build, in the same
 * order the components were bundled.
 *
 * Overrides get the same only-ship-what-is-used treatment as canon CSS: a
 * component that is not on any page contributes neither its own styles nor
 * its override.
 *
 * @param {string[]} componentNames - Names of the components being bundled
 * @param {string} projectRoot - Project root directory
 * @param {Object} layers - Normalized layer options
 * @returns {Array<{name: string, file: string, css: string}>} Overrides found
 */
function collectOverrides(componentNames, projectRoot, layers) {
  const found = [];
  const seen = new Set();
  for (const name of componentNames) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    const file = findOverride(projectRoot, layers.overridesPath, name);
    if (file) {
      found.push({ name, file, css: fs.readFileSync(file, 'utf8') });
    }
  }
  return found;
}

export { collectOverrides, findOverride, isWrappable, layerOrderStatement, wrapInLayer };
