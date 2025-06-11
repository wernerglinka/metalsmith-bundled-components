// ****** Component: button ******
(function() {
// Button component functionality
document.addEventListener('DOMContentLoaded', function() {
  const buttons = document.querySelectorAll('.button');
  
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      console.log('Button clicked:', this.textContent);
    });
  });
});
})();

// ****** Component: banner ******
(function() {
// Banner component functionality
document.addEventListener('DOMContentLoaded', function() {
  const banners = document.querySelectorAll('.banner');
  
  if (banners.length > 0) {
    console.log('Banner components initialized');
  }
});
})();