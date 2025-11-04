/**
 * Component Helper Utilities
 *
 * Small utility functions for working with component maps and manifests
 */

/**
 * Helper function to get component manifest for validation
 * @param {Map} componentMap - Map of component names to component objects
 * @param {string} sectionType - The section type to look up
 * @returns {Object} Component manifest object
 * @throws {Error} If component is not found
 */
function getManifest( componentMap, sectionType ) {
  const component = componentMap.get( sectionType );
  if ( !component ) {
    throw new Error( `Component "${ sectionType }" not found` );
  }
  return component;
}

export { getManifest };
