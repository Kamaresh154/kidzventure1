var ReportsPage = {
  async render() {
    var user = App.getUser();
    if (user.role !== 'admin') return this.renderEmployeeReport();
    return this.renderAdminReport();
  },

  async renderAdminReport() {
    try {
      var data = await API.get('/reports/dashboard');
      var html = '<div class="page-title">Reports</div>'
        + '<div class="card"><div class="card-header"><div class="card-title">Overview</div></div>'
        + '<div class="stats-grid">'
        + '<div class="stat-card"><div class="stat-value">' + data.total_employees + '</div><div class="stat-label">Employees</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.total_leads + '</div><div class="stat-label">Total Leads</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + formatCurrency(data.monthly_revenue) + '</div><div class="stat-label">Monthly Revenue</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.total_quotations + '</div><div class="stat-label">Quotations</div></div>'
        + '</div></div>';

      if (data.leads_by_status && data.leads_by_status.length) {
        html += '<div class="card"><div class="card-header"><div class="card-title">Leads by Status</div></div>';
        html += data.leads_by_status.map(function(s) {
          return '<div class="flex justify-between items-center p-3" style="border-bottom:1px solid #2d2d4a">'
            + '<span>' + getStatusBadge(s._id) + '</span>'
            + '<span style="font-weight:700">' + s.count + '</span></div>';
        }).join('');
        html += '</div>';
      }

      html += '<div class="card"><div class="card-header"><div class="card-title">Employee Performance</div></div>'
        + '<div class="table-container"><table><thead><tr><th>Employee</th><th>Leads</th><th>Contacted</th><th>Today</th></tr></thead><tbody>';
      if (data.employee_performance && data.employee_performance.length) {
        html += data.employee_performance.map(function(emp) {
          var today = emp.checked_in ? '<span style="color:#10b981">✓ ' + (emp.checked_in_time || '') + '</span>' : '<span style="color:#ef4444">✗</span>';
          return '<tr><td>' + emp.name + '</td><td>' + emp.leads_assigned + '</td><td>' + emp.leads_contacted + '</td><td>' + today + '</td></tr>';
        }).join('');
      } else {
        html += '<tr><td colspan="4" class="text-center">No data</td></tr>';
      }
      html += '</tbody></table></div></div>'
        + '<div class="card"><div class="card-header"><div class="card-title">Quick Actions</div></div>'
        + '<div class="flex gap-2" style="flex-wrap:wrap">'
        + '<button class="btn btn-outline btn-sm" onclick="ReportsPage.exportData(\'leads\')">📤 Export Leads</button>'
        + '<button class="btn btn-outline btn-sm" onclick="ReportsPage.exportData(\'products\')">📤 Export Products</button>'
        + '<button class="btn btn-outline btn-sm" onclick="ReportsPage.exportData(\'quotations\')">📤 Export Quotations</button>'
        + '</div></div>';

      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">📊</div><h3>Failed to load reports</h3></div>';
    }
  },

  async renderEmployeeReport() {
    try {
      var data = await API.get('/reports/dashboard');
      var html = '<div class="page-title">My Performance</div>'
        + '<div class="stats-grid">'
        + '<div class="stat-card"><div class="stat-value">' + data.contacted_leads + '</div><div class="stat-label">Leads Contacted</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.total_leads + '</div><div class="stat-label">Total Assigned</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.month_leads + '</div><div class="stat-label">This Month</div></div>'
        + '<div class="stat-card"><div class="stat-value">' + data.pending_leaves + '</div><div class="stat-label">Pending Leaves</div></div>'
        + '</div>';

      if (data.recent_contacts && data.recent_contacts.length) {
        html += '<div class="card"><div class="card-header"><div class="card-title">Recently Contacted</div></div>';
        html += data.recent_contacts.map(function(l) {
          return '<div class="flex justify-between items-center p-3" style="border-bottom:1px solid #2d2d4a">'
            + '<div><div style="font-weight:600">' + l.name + '</div>'
            + '<div style="font-size:0.8rem;color:#9ca3af">' + l.phone + ' (' + l.count + ' times)</div></div>'
            + getStatusBadge(l.status) + '</div>';
        }).join('');
        html += '</div>';
      } else {
        html += '<div class="empty-state"><div class="icon">📞</div><h3>Start contacting leads!</h3></div>';
      }

      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">📊</div><h3>Failed to load reports</h3></div>';
    }
  },

  async exportData(type) {
    var map = { leads: '/leads/export', products: '/products/export', quotations: '/quotations/export' };
    try { var blob = await API.download(map[type]); downloadBlob(blob, type + '.xlsx'); showToast('Exported ' + type); }
    catch (err) { showToast(err.message, 'error'); }
  },

  init() {},
};
