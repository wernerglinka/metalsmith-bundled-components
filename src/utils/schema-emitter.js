/**
 * Schema Emitter - Composes per-section editor schemas from manifests
 *
 * An external editor needs, for each section type, the complete nested tree
 * of authored fields with their presentation hints. Section manifests keep
 * that DRY by referencing shared field groups from partials with a `$use`
 * key (for example a section's `text` group is `{ "$use": "text" }`, drawing
 * the field set from the `text` partial's own `fields` block).
 *
 * This module expands those references against the component map, producing
 * a fully resolved, nested field tree per section. The plugin already
 * discovers every component and follows `requires`; this surfaces the
 * composed result so the editor never re-implements composition in the
 * browser.
 *
 * Resolution rules for a node in a `fields` tree:
 * - A node with a string `widget` is a leaf field and is returned as-is.
 *   The exception is `widget: "array"`, whose `items` sub-tree is resolved
 *   so array entries can themselves use `$use`.
 * - A node with a string `$use` is replaced by the referenced component's
 *   resolved `fields`. Any other keys on the node are deep-merged on top,
 *   which lets a section override an inherited field (e.g. a different
 *   `titleTag` default) without redefining the whole group.
 * - Any other object is a group; its entries are resolved recursively.
 */

/**
 * @param {*} value
 * @returns {boolean} True for a non-null, non-array object.
 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep-merge override keys onto a base object. Plain-object values merge
 * recursively; everything else replaces.
 * @param {Object} base
 * @param {Object} override
 * @returns {Object} A new merged object.
 */
function deepMerge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out;
}

/**
 * Resolve a single node in a fields tree.
 * @param {*} node
 * @param {Map<string, Object>} componentMap
 * @param {Set<string>} seen - $use targets currently being expanded (cycle guard).
 * @returns {*} The resolved node.
 */
function resolveNode(node, componentMap, seen) {
  if (!isPlainObject(node)) {
    return node;
  }

  // $use reference: expand the referenced component's fields, then merge any
  // sibling override keys on top.
  if (typeof node.$use === 'string') {
    const ref = node.$use;
    if (seen.has(ref)) {
      throw new Error(`Circular $use reference: ${[...seen, ref].join(' -> ')}`);
    }
    const target = componentMap.get(ref);
    if (!target) {
      throw new Error(`$use references unknown component "${ref}"`);
    }
    if (!isPlainObject(target.fields)) {
      throw new Error(`$use target "${ref}" has no fields block to compose`);
    }

    const nextSeen = new Set(seen).add(ref);
    const resolved = resolveFields(target.fields, componentMap, nextSeen);

    const { $use, ...overrides } = node;
    if (Object.keys(overrides).length === 0) {
      return resolved;
    }
    return deepMerge(resolved, resolveFields(overrides, componentMap, seen));
  }

  // Leaf field. An array widget carries an `items` sub-tree that may itself
  // reference partials, so resolve it.
  if (typeof node.widget === 'string') {
    if (node.widget === 'array' && isPlainObject(node.items)) {
      return { ...node, items: resolveFields(node.items, componentMap, seen) };
    }
    return node;
  }

  // Plain group.
  return resolveFields(node, componentMap, seen);
}

/**
 * Resolve every entry of a fields tree.
 * @param {Object} fields
 * @param {Map<string, Object>} componentMap
 * @param {Set<string>} [seen]
 * @returns {Object} The resolved fields tree.
 */
function resolveFields(fields, componentMap, seen = new Set()) {
  const out = {};
  for (const [key, node] of Object.entries(fields)) {
    out[key] = resolveNode(node, componentMap, seen);
  }
  return out;
}

/**
 * Build the composed editor schema for every section that declares a
 * `fields` block. Sections without one are skipped, so the schema grows as
 * components are migrated to the new format.
 *
 * @param {Array<Object>} sectionComponents - Section components (each a spread manifest).
 * @param {Map<string, Object>} componentMap - Map of all components by name.
 * @returns {Object<string, {name: string, fields: Object}>} Schema keyed by section name.
 */
function buildComponentsSchema(sectionComponents, componentMap) {
  const schema = {};
  for (const section of sectionComponents) {
    if (!isPlainObject(section.fields)) {
      continue;
    }
    schema[section.name] = {
      name: section.name,
      fields: resolveFields(section.fields, componentMap)
    };
  }
  return schema;
}

export { buildComponentsSchema, resolveFields };
