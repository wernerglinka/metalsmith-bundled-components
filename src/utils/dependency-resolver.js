/**
 * Validate all component dependencies exist
 * @param {Map} componentMap - Component map
 * @returns {Array} Array of error messages
 */
function validateDependencies( componentMap ) {
  const errors = [];

  componentMap.forEach( ( component, name ) => {
    component.dependencies.forEach( dependency => {
      if ( !componentMap.has( dependency ) ) {
        errors.push( `Component '${ name }' depends on unknown component '${ dependency }'` );
      }
    } );
  } );

  return errors;
}

/**
 * Resolve dependency order using depth-first traversal
 * Implements a topological sort using depth-first search (DFS) to determine 
 * the correct build order for components based on their dependencies
 * The final order ensures that:
 * - Dependencies are always built before components that need them
 * - CSS is output in the correct order (dependencies first)
 * - JavaScript initializes in the correct order
 * - No circular dependencies are allowed
 * 
 * @param {Map} componentMap - Component map
 * @returns {Array} Ordered component names
 */
function resolveDependencyOrder( componentMap ) {
  const visited = new Set();
  const visiting = new Set();
  const order = [];

  /**
   * Visit component and dependencies
   * @param {string} name - Component name
   * @param {Array} path - Current path for cycle detection
   */
  function visit( name, path = [] ) {
    if ( visited.has( name ) ) {return;}

    if ( visiting.has( name ) ) {
      throw new Error( `Circular dependency: ${ path.join( ' → ' ) } → ${ name }` );
    }

    visiting.add( name );
    const component = componentMap.get( name );

    // Visit dependencies first
    component.dependencies.forEach( dependency => {
      visit( dependency, [ ...path, name ] );
    } );

    visiting.delete( name );
    visited.add( name );
    order.push( name );
  }

  // Visit all components
  componentMap.forEach( ( _, name ) => visit( name ) );

  return order;
}

export { validateDependencies, resolveDependencyOrder };