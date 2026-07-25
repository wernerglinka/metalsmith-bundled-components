// Button component functionality
document.addEventListener('DOMContentLoaded', function() {
  const buttons = document.querySelectorAll('.button');
  
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      console.log('Button clicked:', this.textContent);
    });
  });
});