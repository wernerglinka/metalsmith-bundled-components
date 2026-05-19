// Main application JavaScript with comments for minification testing
console.log('Main application initialized in production mode');

// Initialize global app object
window.app = window.app || {};

// Add some utility functions
window.app.utils = {
  // Log messages with timestamp
  log: function(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
};