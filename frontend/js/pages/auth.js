const AuthPage = {
  render() {
    const setup = localStorage.getItem('initialized');
    if (setup === 'true') {
      return this.renderLogin();
    }
    return this.renderSetup();
  },

  renderSetup() {
    return `
      <div class="login-page">
        <div class="login-logo">KV</div>
        <h1 class="login-title">Welcome!</h1>
        <p class="login-subtitle">Set up your admin account</p>
        <form id="setup-form" class="login-form">
          <div class="form-group">
            <label class="form-label">Your Name</label>
            <input type="text" name="name" placeholder="Admin Name" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" name="email" placeholder="admin@kidzventure.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" name="password" placeholder="Min 6 chars" required minlength="6">
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input type="tel" name="phone" placeholder="Phone number">
          </div>
          <button type="submit" class="btn btn-primary btn-block login-btn">Initialize System</button>
        </form>
      </div>
    `;
  },

  renderLogin() {
    return `
      <div class="login-page">
        <div class="login-logo">KV</div>
        <h1 class="login-title">KidzVenture</h1>
        <p class="login-subtitle">Sign in to your account</p>
        <form id="login-form" class="login-form">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" name="email" placeholder="your@email.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" name="password" placeholder="Enter password" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary btn-block login-btn">Sign In</button>
        </form>
      </div>
    `;
  },

  init() {
    this.checkSetup();
    const form = document.getElementById('login-form') || document.getElementById('setup-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));

      if (form.id === 'setup-form') {
        try {
          const res = await API.post('/setup/init', data);
          localStorage.setItem('initialized', 'true');
          showToast('System initialized! Please login.');
          App.renderPage('auth');
        } catch (err) {
          showToast(err.message, 'error');
        }
      } else {
        try {
          const res = await API.post('/auth/login', data);
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          showToast('Welcome back, ' + res.user.full_name + '!');
          App.initApp();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  },

  async checkSetup() {
    try {
      const res = await API.get('/setup/status');
      if (res.initialized) {
        localStorage.setItem('initialized', 'true');
      } else {
        localStorage.removeItem('initialized');
      }
    } catch (e) {
      // Server might not be running
    }
  },
};
