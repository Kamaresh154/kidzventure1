const App = {
  currentPage: 'dashboard',
  user: null,

  getUser() {
    if (!this.user) {
      try { this.user = JSON.parse(localStorage.getItem('user')); }
      catch (e) { this.user = null; }
    }
    return this.user;
  },

  async init() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await API.get('/auth/me');
        this.user = res.user;
        localStorage.setItem('user', JSON.stringify(res.user));
        this.initApp();
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.renderAuth();
      }
    } else {
      this.renderAuth();
    }
  },

  renderAuth() {
    document.getElementById('app').innerHTML = AuthPage.render();
    AuthPage.init();
  },

  initApp() {
    this.renderShell();
    this.renderPage('dashboard');
    this.bindNavEvents();
  },

  renderShell() {
    const user = this.getUser();
    const isAdmin = user && user.role === 'admin';

    document.getElementById('app').innerHTML = `
      <div class="drawer-overlay" id="drawer-overlay" onclick="App.closeDrawer()"></div>
      <div class="drawer" id="drawer">
        <div class="drawer-header">
          <h2>KidzVenture ERP</h2>
          <button class="modal-close" onclick="App.closeDrawer()">×</button>
        </div>
        <ul class="nav-list">
          <li class="nav-item active" data-page="dashboard" onclick="App.navigate('dashboard')">
            <span class="icon">📊</span> Dashboard
          </li>
          <li class="nav-item" data-page="products" onclick="App.navigate('products')">
            <span class="icon">📦</span> Products
          </li>
          <li class="nav-item" data-page="leads" onclick="App.navigate('leads')">
            <span class="icon">👤</span> Leads
          </li>
          <li class="nav-item" data-page="quotations" onclick="App.navigate('quotations')">
            <span class="icon">📄</span> Quotations
          </li>
          <li class="nav-item" data-page="attendance" onclick="App.navigate('attendance')">
            <span class="icon">📋</span> Attendance
          </li>
          <li class="nav-item" data-page="leaves" onclick="App.navigate('leaves')">
            <span class="icon">📅</span> Leaves
          </li>
          <li class="nav-item" data-page="invoices" onclick="App.navigate('invoices')">
            <span class="icon">🧾</span> Invoices
          </li>
          ${isAdmin ? `
          <li class="nav-item" data-page="employees" onclick="App.navigate('employees')">
            <span class="icon">👥</span> Employees
          </li>
          ` : ''}
          <li class="nav-item" data-page="reports" onclick="App.navigate('reports')">
            <span class="icon">📊</span> Reports
          </li>
        </ul>
        <div class="drawer-footer">
          <div class="user-info">
            <div class="name">${user ? user.full_name : ''}</div>
            <div style="font-size:0.75rem">${user ? user.role.toUpperCase() : ''}</div>
          </div>
          <button class="btn btn-danger btn-sm btn-block mt-2" onclick="App.logout()">Sign Out</button>
        </div>
      </div>

      <div class="app-header">
        <button class="btn btn-icon btn-outline menu-btn" onclick="App.openDrawer()">☰</button>
        <div class="flex items-center gap-2">
          <img src="logo.jpeg" style="height:28px;width:28px;border-radius:6px;object-fit:cover" alt="Logo">
          <h1 id="page-title">Dashboard</h1>
        </div>
        <div class="header-actions">
          <button class="btn btn-icon btn-outline" onclick="App.openDrawer()" style="display:none">☰</button>
        </div>
      </div>

      <div class="page" id="page-content"></div>
    `;
  },

  navigate(page) {
    this.currentPage = page;
    this.renderPage(page);
    this.closeDrawer();
  },

  async renderPage(page) {
    const content = document.getElementById('page-content');
    if (!content) return;

    const titles = {
      dashboard: 'Dashboard',
      products: 'Products',
      leads: 'Leads',
      quotations: 'Quotations',
      invoices: 'Invoices',
      attendance: 'Attendance',
      leaves: 'Leaves',
      employees: 'Employees',
      reports: 'Reports',
    };

    document.getElementById('page-title').textContent = titles[page] || 'KidzVenture';

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    try {
      let html = '';
      switch (page) {
        case 'dashboard':
          const user = this.getUser();
          html = user && user.role === 'admin' ? await DashboardPage.renderAdmin() : await DashboardPage.renderEmployee();
          break;
        case 'products': html = await ProductsPage.renderProducts(); break;
        case 'leads': html = await LeadsPage.renderLeads(); break;
        case 'quotations': html = await QuotationsPage.renderQuotations(); break;
        case 'attendance': html = await AttendancePage.render(); break;
        case 'leaves': html = await LeavesPage.render(); break;
        case 'invoices': html = await InvoicesPage.renderInvoices(); break;
        case 'employees': html = await EmployeesPage.render(); break;
        case 'reports': html = await ReportsPage.render(); break;
        default: html = await DashboardPage.renderAdmin();
      }
      content.innerHTML = html;
    } catch (err) {
      content.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Error loading page</h3></div>';
    }

    // Initialize page scripts
    setTimeout(() => {
      switch (page) {
        case 'dashboard': DashboardPage.init(); break;
        case 'products': ProductsPage.init(); break;
        case 'leads': LeadsPage.init(); break;
        case 'quotations': QuotationsPage.init(); break;
        case 'attendance': AttendancePage.init(); break;
        case 'leaves': LeavesPage.init(); break;
        case 'employees': EmployeesPage.init(); break;
        case 'invoices': InvoicesPage.init(); break;
        case 'reports': ReportsPage.init(); break;
      }
    }, 100);
  },

  openDrawer() {
    document.getElementById('drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('open');
  },

  closeDrawer() {
    document.getElementById('drawer')?.classList.remove('open');
    document.getElementById('drawer-overlay')?.classList.remove('open');
  },

  bindNavEvents() {
    // Clicking outside drawer closes it
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.user = null;
    showToast('Signed out');
    this.renderAuth();
  },
};

// Modal helpers
function showModal(title, bodyHtml, showClose = true) {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        ${showClose ? '<button class="modal-close" onclick="closeModal()">×</button>' : ''}
      </div>
      <div class="modal-body">${bodyHtml}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  if (showClose) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }
}

function closeModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => App.init());
