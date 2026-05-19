// Dependent component (depends on base)
const DependentComponent = {
  init: function() {
    // This would fail if base component wasn't loaded first
    if (BaseComponent.init()) {
      console.log('Dependent component initialized');
    }
  }
};