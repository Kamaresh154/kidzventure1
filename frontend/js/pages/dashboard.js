var DashboardPage = {
  async render() {
    var user = App.getUser();
    if (user.role === 'admin') return '<div class="loading"><div class="spinner"></div></div>';
    return '<div class="loading"><div class="spinner"></div></div>';
  },

  async renderAdmin() {
    try {
      var data = await API.get('/reports/dashboard');
      var html = '<div class="page-title">Dashboard</div>'
        + '<div class="stats-grid">'
        + '<div class="stat-card"><div class="stat-value">' + data.total_employees + '</div><div class="stat-label">Employees</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.total_leads + '</div><div class="stat-label">Total Leads</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.checked_in_today + '</div><div class="stat-label">Checked In</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.pending_leaves + '</div><div class="stat-label">Pending Leaves</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.total_quotations + '</div><div class="stat-label">Quotations</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.total_products + '</div><div class="stat-label">Products</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + formatCurrency(data.monthly_revenue) + '</div><div class="stat-label">Monthly Revenue</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.new_leads_today + '</div><div class="stat-label">New Leads Today</div></div>'
        + '</div>';

      html += '<div class="card"><div class="card-header"><div class="card-title">Employee Performance</div></div>'
        + '<div class="table-container"><table><thead><tr><th>Employee</th><th>Leads</th><th>Contacted</th><th>Status</th></tr></thead><tbody>';
      if (data.employee_performance && data.employee_performance.length) {
        html += data.employee_performance.map(function(emp) {
          var status = emp.checked_in ? '<span style="color:#10b981">In</span>' : '<span style="color:#ef4444">Out</span>';
          return '<tr><td>' + emp.name + '</td><td>' + emp.leads_assigned + '</td><td>' + emp.leads_contacted + '</td><td>' + status + '</td></tr>';
        }).join('');
      } else {
        html += '<tr><td colspan="4" class="text-center">No employees</td></tr>';
      }
      html += '</tbody></table></div></div>';

      if (data.recent_leads && data.recent_leads.length) {
        html += '<div class="card"><div class="card-header"><div class="card-title">Recent Leads</div></div>';
        html += data.recent_leads.map(function(l) {
          return '<div class="flex justify-between items-center p-3" style="border-bottom:1px solid #2d2d4a">'
            + '<div><div style="font-weight:600">' + l.name + '</div><div style="font-size:0.8rem;color:#9ca3af">' + l.phone + '</div></div>'
            + getStatusBadge(l.status) + '</div>';
        }).join('');
        html += '</div>';
      }

      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">📊</div><h3>Failed to load dashboard</h3></div>';
    }
  },

  async renderEmployee() {
    try {
      var data = await API.get('/reports/dashboard');
      var html = '<div class="page-title">My Dashboard</div>'
        + '<div class="stats-grid">'
        + '<div class="stat-card"><div class="stat-value">' + data.total_leads + '</div><div class="stat-label">My Leads</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.contacted_leads + '</div><div class="stat-label">Contacted</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.month_leads + '</div><div class="stat-label">This Month</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.pending_leaves + '</div><div class="stat-label">Pending Leaves</div></div>'
        + '</div>'
        + '<div class="card"><div class="card-header"><div class="card-title">Today\'s Attendance</div></div>'
        + '<div class="flex gap-3 items-center justify-center" style="padding:1rem">'
        + '<span class="btn ' + (data.checked_in ? 'btn-success' : 'btn-outline') + ' btn-sm" id="dash-check-in">Check In</span>'
        + '<span class="btn ' + (data.checked_out ? 'btn-success' : 'btn-outline') + ' btn-sm" id="dash-check-out">Check Out</span>'
        + '</div></div>';

      if (data.recent_contacts && data.recent_contacts.length) {
        html += '<div class="card"><div class="card-header"><div class="card-title">Recent Contacts</div></div>';
        html += data.recent_contacts.map(function(l) {
          return '<div class="flex justify-between items-center p-3" style="border-bottom:1px solid #2d2d4a">'
            + '<div><div style="font-weight:600">' + l.name + '</div><div style="font-size:0.8rem;color:#9ca3af">' + l.phone + '</div></div>'
            + getStatusBadge(l.status) + '</div>';
        }).join('');
        html += '</div>';
      } else {
        html += '<div class="empty-state"><div class="icon">📞</div><h3>No contacts yet</h3></div>';
      }

      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">📊</div><h3>Failed to load dashboard</h3></div>';
    }
  },

  init() {
    var user = App.getUser();
    if (!user) return;

    if (user.role === 'admin') {
      var checkInBtn = document.getElementById('dash-check-in');
      if (checkInBtn) checkInBtn.addEventListener('click', function() { App.navigate('attendance'); });
    } else {
      var checkInBtn = document.getElementById('dash-check-in');
      var checkOutBtn = document.getElementById('dash-check-out');
      if (checkInBtn) {
        checkInBtn.addEventListener('click', async function() {
          try { await API.post('/attendance/check-in'); showToast('Checked in!'); App.renderPage('dashboard'); }
          catch (err) { showToast(err.message, 'error'); }
        });
      }
      if (checkOutBtn) {
        checkOutBtn.addEventListener('click', async function() {
          try { await API.post('/attendance/check-out'); showToast('Checked out!'); App.renderPage('dashboard'); }
          catch (err) { showToast(err.message, 'error'); }
        });
      }
    }
  },
};
