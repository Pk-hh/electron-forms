/* theme.js */
(function () {
  // Read saved theme or fallback to system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  setTheme(initialTheme);

  // Expose theme switcher functions globally
  window.themeManager = {
    getTheme() {
      return document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    },
    setTheme(theme) {
      setTheme(theme);
    },
    toggle() {
      const current = this.getTheme();
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
      return next;
    }
  };

  function setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      document.documentElement.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', theme);
    // Dispatch an event to update charts or elements dynamically if needed
    window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme } }));
  }

  // Initialize theme-toggle button event listener if it exists
  document.addEventListener('DOMContentLoaded', () => {
    const toggler = document.getElementById('theme-toggle-btn');
    if (toggler) {
      // Set initial icon or state if needed
      updateTogglerIcon(toggler, window.themeManager.getTheme());
      toggler.addEventListener('click', () => {
        const newTheme = window.themeManager.toggle();
        updateTogglerIcon(toggler, newTheme);
      });
    }
  });

  function updateTogglerIcon(btn, theme) {
    // If we're using Lucide icons:
    const iconEl = btn.querySelector('i');
    if (iconEl) {
      if (theme === 'dark') {
        iconEl.setAttribute('data-lucide', 'sun');
      } else {
        iconEl.setAttribute('data-lucide', 'moon');
      }
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  }
})();
