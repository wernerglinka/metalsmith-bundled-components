/**
 * Dependency Resolver - Resolves transitive component dependencies
 *
 * Given a set of directly used components, this module finds all transitively
 * required components by following the `requires` arrays in component manifests.
 *
 * Since components use IIFEs (JS) and are namespaced (CSS), concatenation order
 * doesn't affect functionality. Cascade layers are the exception: sublayer
 * precedence follows declaration order, so `sortByDependencyOrder` provides the
 * order in which component sublayers are declared.
 */

/**
 * Resolve all transitive dependencies for a set of components
 *
 * Starting with a set of directly used components, follows the dependency
 * chain to find all components that must be included. Uses breadth-first
 * traversal to collect all dependencies.
 *
 * @param {Set<string>} usedComponents - Set of component names directly used in templates
 * @param {Map<string, Object>} componentMap - Map of all available components
 * @returns {Set<string>} - Set of all components needed (used + dependencies)
 *
 * @example
 * // If "hero" requires "button" and "button" requires "icon"
 * // Input: new Set(['hero'])
 * // Output: new Set(['hero', 'button', 'icon'])
 */
function resolveAllDependencies(usedComponents, componentMap) {
  const resolved = new Set(usedComponents);
  const queue = [...usedComponents];

  while (queue.length > 0) {
    const currentName = queue.shift();
    const component = componentMap.get(currentName);

    // Skip if component not found (will be caught by validation later)
    if (!component) {
      continue;
    }

    // Get requirements (supports both 'requires' and legacy 'dependencies')
    const requirements = component.requires || component.dependencies || [];

    requirements.forEach((requiredName) => {
      if (!resolved.has(requiredName)) {
        resolved.add(requiredName);
        queue.push(requiredName);
      }
    });
  }

  return resolved;
}

/**
 * Filter component list to only include needed components
 *
 * Takes a list of all available components and returns only those that
 * are needed (either used directly or required transitively).
 *
 * @param {Array<Object>} allComponents - Array of all available components
 * @param {Set<string>} neededComponents - Set of component names to include
 * @returns {Array<Object>} - Filtered array of component objects
 */
function filterNeededComponents(allComponents, neededComponents) {
  return allComponents.filter((component) => neededComponents.has(component.name));
}

/**
 * Sort components so a component's requirements come before the component
 * itself.
 *
 * CSS cascade layers rank sublayers by declaration order, later wins. The
 * bundler declares component sublayers in this order so a shared base that
 * everything requires (a `commons` section, say) lands lowest, and every
 * component building on it can override its rules regardless of specificity
 * or of where either component's rules sit in the bundle.
 *
 * Depth-first with the incoming order as tiebreak, so components without
 * requirement edges between them keep their discovery order. Requirement
 * cycles are tolerated: a component already on the active path stays where
 * the traversal first reached it rather than throwing.
 *
 * @param {Array<Object>} components - Component objects with `requires` or legacy `dependencies`
 * @returns {Array<Object>} New array with dependencies before dependents
 *
 * @example
 * // "artwork" requires "commons"; input order is alphabetical
 * // Input:  [artwork, commons]
 * // Output: [commons, artwork]
 */
function sortByDependencyOrder(components) {
  const byName = new Map(components.map((component) => [component.name, component]));
  const ordered = [];
  const placed = new Set();
  const visiting = new Set();

  const visit = (component) => {
    if (placed.has(component.name) || visiting.has(component.name)) {
      return;
    }
    visiting.add(component.name);

    const requirements = component.requires || component.dependencies || [];
    requirements.forEach((requiredName) => {
      const required = byName.get(requiredName);
      if (required) {
        visit(required);
      }
    });

    visiting.delete(component.name);
    placed.add(component.name);
    ordered.push(component);
  };

  components.forEach(visit);
  return ordered;
}

export { filterNeededComponents, resolveAllDependencies, sortByDependencyOrder };
