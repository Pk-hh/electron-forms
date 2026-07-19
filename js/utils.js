/* utils.js */
const Utils = {
  // Toast notifications
  showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} glass-panel`;
    
    // Icon mapping
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'warning') iconName = 'alert-circle';
    
    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>
      <span>${this.escapeHTML(message)}</span>
    `;
    
    container.appendChild(toast);
    
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          style: 'stroke-width: 2px;'
        }
      });
    }

    setTimeout(() => {
      toast.style.animation = 'slide-in 0.3s reverse forwards';
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, duration);
  },

  // Modals manager
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent scrolling background
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // HTML sanitization to prevent XSS
  escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Sanitize URLs to prevent javascript:/data:text/html/svg etc. XSS
  sanitizeURL(url) {
    if (!url) return '#';
    const trimmed = url.trim();
    // Block javascript: and vbscript:
    if (/^(javascript:|vbscript:)/i.test(trimmed)) {
      return '#';
    }
    // Block potential inline data URL exploits (e.g. HTML, SVG)
    if (/^data:/i.test(trimmed)) {
      const match = trimmed.match(/^data:([^;]+);/i);
      if (match) {
        const mime = match[1].toLowerCase();
        // Allow only standard safe types (images except svg, pdf, generic binary stream, plain text, audio, video)
        const isSafeMime = /^(image\/(png|jpeg|jpg|gif|webp|bmp)|application\/(pdf|msword|vnd\.|zip|octet-stream)|text\/plain|audio\/|video\/)/i.test(mime);
        if (!isSafeMime) {
          return 'data:text/plain;base64,VW5zYWZlIGZpbGUgdHlwZSBibG9ja2VkLg=='; // "Unsafe file type blocked." in base64
        }
      } else {
        return '#';
      }
    }
    return trimmed;
  },

  // Sanitize CSS color inputs to prevent CSS/style/HTML breakout
  sanitizeColor(color, fallback = 'var(--accent-color)') {
    if (!color) return fallback;
    const trimmed = color.trim();
    // Match hex, rgb, rgba, hsl, hsla, and standard CSS variable patterns
    const hexPattern = /^#(?:[0-9a-fA-F]{3,4}){1,2}$/;
    const rgbPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*(?:0|1|0?\.\d+))?\s*\)$/i;
    const hslPattern = /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*(?:0|1|0?\.\d+))?\s*\)$/i;
    const varPattern = /^var\(--[a-zA-Z0-9_-]+\)$/;
    
    // Simple common safe color names
    const safeNames = /^(transparent|red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|grey|indigo|violet|emerald|teal|cyan|sky|amber|rose|fuchsia|lime|slate|zinc|neutral|stone)$/i;
    
    if (hexPattern.test(trimmed) || rgbPattern.test(trimmed) || hslPattern.test(trimmed) || varPattern.test(trimmed) || safeNames.test(trimmed)) {
      return trimmed;
    }
    return fallback;
  },

  // Unique ID Generator
  uuid() {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.randomUUID === 'function') {
        return 'f_' + crypto.randomUUID().replace(/-/g, '').substring(0, 9);
      }
      if (typeof crypto.getRandomValues === 'function') {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return 'f_' + array[0].toString(36).substring(0, 9);
      }
    }
    return 'f_' + Math.random().toString(36).substr(2, 9);
  },

  // Date formatter
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Dropdown menus helper
  initDropdowns() {
    document.addEventListener('click', (e) => {
      // Find all elements with data-toggle="dropdown"
      const toggle = e.target.closest('[data-toggle="dropdown"]');
      if (toggle) {
        e.preventDefault();
        const targetId = toggle.getAttribute('data-target');
        const dropdown = document.getElementById(targetId);
        
        if (dropdown) {
          // Close other open dropdowns first
          document.querySelectorAll('.dropdown-menu.active').forEach(d => {
            if (d !== dropdown) d.classList.remove('active');
          });
          
          dropdown.classList.toggle('active');
        }
      } else if (!e.target.closest('.dropdown-menu')) {
        // Clicked outside, close all dropdowns
        document.querySelectorAll('.dropdown-menu.active').forEach(d => {
          d.classList.remove('active');
        });
      }
    });
  },

  // Form input validation helper
  validateInput(value, rules = {}) {
    if (rules.required && (value === undefined || value === null || value === '')) {
      return 'This field is required';
    }
    if (value) {
      if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
      }
      if (rules.url && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(value)) {
        return 'Please enter a valid URL';
      }
      if (rules.phone && !/^\+?[0-9\s\-()]{7,15}$/.test(value)) {
        return 'Please enter a valid phone number';
      }
      if (rules.number && isNaN(Number(value))) {
        return 'Please enter a valid number';
      }
      if (rules.min && Number(value) < rules.min) {
        return `Value must be at least ${rules.min}`;
      }
      if (rules.max && Number(value) > rules.max) {
        return `Value cannot exceed ${rules.max}`;
      }
    }
    return null; // No error
  }
};

// Initialize modal triggers on document load
document.addEventListener('DOMContentLoaded', () => {
  Utils.initDropdowns();
  
  // Close modals on clicking backdrop
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        Utils.closeModal(modal.id);
      }
    });
  });

  // Modal dismiss buttons
  document.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) {
        Utils.closeModal(modal.id);
      }
    });
  });
});
