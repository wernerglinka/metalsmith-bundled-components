// Modal component with ES module imports
import { createOverlay, trapFocus, MODAL_DEFAULTS } from './utils.js';

class Modal {
  constructor(element, options = {}) {
    this.element = element;
    this.options = { ...MODAL_DEFAULTS, ...options };
    this.overlay = null;
    this.isOpen = false;
    
    this.init();
  }
  
  init() {
    // Find trigger buttons
    const triggers = document.querySelectorAll(`[data-modal-target="${this.element.id}"]`);
    triggers.forEach(trigger => {
      trigger.addEventListener('click', () => this.open());
    });
    
    // Close button
    const closeBtn = this.element.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    
    // Escape key
    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }
  }
  
  open() {
    if (this.isOpen) return;
    
    this.overlay = createOverlay();
    document.body.appendChild(this.overlay);
    
    if (this.options.closeOnOverlayClick) {
      this.overlay.addEventListener('click', () => this.close());
    }
    
    this.element.classList.add('modal-open');
    this.overlay.classList.add('modal-overlay-visible');
    
    trapFocus(this.element);
    this.isOpen = true;
  }
  
  close() {
    if (!this.isOpen) return;
    
    this.element.classList.remove('modal-open');
    this.overlay.classList.remove('modal-overlay-visible');
    
    setTimeout(() => {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    }, this.options.animationDuration);
    
    this.isOpen = false;
  }
}

// Initialize all modals on page
document.addEventListener('DOMContentLoaded', () => {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => new Modal(modal));
});

export default Modal;