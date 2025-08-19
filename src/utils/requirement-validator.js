/**
 * Simple requirement validation for component dependencies
 * 
 * Replaces complex dependency resolution with basic existence checking.
 * Components are namespaced, so ordering is handled by simple alphabetical sorting.
 * This validates that components marked as 'requires' or 'dependencies' exist.
 */

/**
 * Validate that all required components exist in the component map
 * 
 * Checks both 'requires' (new format) and 'dependencies' (backward compatibility)
 * for component manifest declarations. Does not enforce ordering.
 * 
 * @param {Map} componentMap - Map of component names to component objects
 * @returns {Array<string>} Array of error messages (empty if all requirements met)
 */
function validateRequirements( componentMap ) {
  const errors = [];
  
  componentMap.forEach( ( component ) => {
    // Check both 'requires' (new) and 'dependencies' (backward compat)
    const requirements = component.requires || component.dependencies || [];
    
    requirements.forEach( required => {
      if ( !componentMap.has( required ) ) {
        errors.push( 
          `Component "${component.name}" requires "${required}" which was not found` 
        );
      }
    } );
  } );
  
  return errors;
}

export { validateRequirements };