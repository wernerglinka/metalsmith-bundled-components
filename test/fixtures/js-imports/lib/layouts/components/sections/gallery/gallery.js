// Gallery component with imports
import { preloadImage, debounce } from './gallery-utils.js';

class Gallery {
  constructor(element) {
    this.element = element;
    this.images = Array.from(element.querySelectorAll('.gallery-image'));
    this.currentIndex = 0;
    
    this.init();
  }
  
  async init() {
    // Preload all images
    const imagePromises = this.images.map(img => 
      preloadImage(img.dataset.fullSize || img.src)
    );
    
    try {
      await Promise.all(imagePromises);
      console.log('All gallery images loaded');
    } catch (error) {
      console.error('Error loading gallery images:', error);
    }
    
    // Setup navigation with debouncing
    const handleResize = debounce(() => {
      this.adjustGalleryLayout();
    }, 250);
    
    window.addEventListener('resize', handleResize);
    
    // Setup click handlers
    this.images.forEach((img, index) => {
      img.addEventListener('click', () => this.showImage(index));
    });
  }
  
  showImage(index) {
    this.currentIndex = index;
    // Implementation for showing full-size image
    console.log(`Showing image ${index}`);
  }
  
  adjustGalleryLayout() {
    // Responsive layout adjustments
    const width = window.innerWidth;
    const columns = width > 1200 ? 4 : width > 768 ? 3 : 2;
    this.element.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  }
}

// Auto-initialize galleries
document.addEventListener('DOMContentLoaded', () => {
  const galleries = document.querySelectorAll('.gallery');
  galleries.forEach(gallery => new Gallery(gallery));
});

export default Gallery;