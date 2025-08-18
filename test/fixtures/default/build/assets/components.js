(() => {
  // test/fixtures/default/lib/layouts/components/_partials/button/button.js
  document.addEventListener("DOMContentLoaded", function() {
    const buttons = document.querySelectorAll(".button");
    buttons.forEach((button) => {
      button.addEventListener("click", function(e) {
        console.log("Button clicked:", this.textContent);
      });
    });
  });

  // test/fixtures/default/lib/layouts/components/sections/banner/banner.js
  document.addEventListener("DOMContentLoaded", function() {
    const banners = document.querySelectorAll(".banner");
    if (banners.length > 0) {
      console.log("Banner components initialized");
    }
  });
})();
