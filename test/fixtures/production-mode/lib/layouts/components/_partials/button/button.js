// Button component JavaScript with comments for minification testing
document.addEventListener('DOMContentLoaded', function() {
  // Find all button elements
  const buttons = document.querySelectorAll('.button');
  
  // Add click handlers to each button
  buttons.forEach((button) => {
    button.addEventListener('click', function(e) {
      // Log the button click
      console.log('Button clicked:', this.textContent);
      
      // Add some visual feedback
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 100);
    });
  });
});