// ****** Component: base ******
(function() {
// Base component (required by others)
const BaseComponent = {
  init: function() {
    console.log('Base component initialized');
    return true;
  }
};
})();

// ****** Component: dependent ******
(function() {
// Dependent component (depends on base)
const DependentComponent = {
  init: function() {
    // This would fail if base component wasn't loaded first
    if (BaseComponent.init()) {
      console.log('Dependent component initialized');
    }
  }
};
})();