/* auth.js */

const Auth = {
  async init() {
    // Basic init if needed
  },

  async getCurrentUser() {
    return await window.db.getCurrentUser();
  },

  async login(email, password) {
    try {
      const user = await window.db.loginWithEmail(email, password);
      Utils.showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
      return user;
    } catch (error) {
      Utils.showToast(error.message, 'error');
      throw error;
    }
  },

  async register(email, password, displayName) {
    try {
      const user = await window.db.registerWithEmail(email, password, displayName);
      Utils.showToast(`Account created successfully!`, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
      return user;
    } catch (error) {
      Utils.showToast(error.message, 'error');
      throw error;
    }
  },

  async logout() {
    try {
      await window.db.logout();
      Utils.showToast('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 800);
    } catch (error) {
      Utils.showToast(error.message, 'error');
    }
  },

  // Auth guard function
  async checkAuth(redirectOnFail = true) {
    const user = await this.getCurrentUser();
    const path = window.location.pathname;
    const isLanding = path === '/' || path.endsWith('/') || path.includes('index.html');
    const isAuthPage = path.includes('login.html') || path.includes('register.html');
    const isPublicForm = path.includes('form.html') || path.includes('preview.html') || isLanding;

    if (!user) {
      // If we are not logged in and on a protected page, redirect to login
      if (redirectOnFail && !isAuthPage && !isPublicForm) {
        window.location.href = 'login.html';
      }
    } else {
      // If logged in and on login/register pages, redirect to dashboard
      if (isAuthPage) {
        window.location.href = 'dashboard.html';
      }
    }
    return user;
  }
};

// Auto-run auth guard checks
document.addEventListener('DOMContentLoaded', async () => {
  await Auth.checkAuth(true);

  // Bind global signout button event if present
  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  }
});

window.auth = Auth;
