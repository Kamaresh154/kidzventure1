const LeadsPage = {
  currentPage: 1,
  search: '',
  statusFilter: '',

  async render() {
    return '<div class="loading"><div class="spinner"></div></div>';
  },

  async renderLeads() {
    try {
      const params = new URLSearchParams({ page: this.currentPage, limit: 50 });
      if (this.search) params.set('search', this.search);
      if (this.statusFilter) params.set('status', this.statusFilter);

      const data = await API.get('/leads?' + params.toString());
      const user = App.getUser();
      const isAdmin = user.role === 'admin';

      let html = '<div class="page-title">Leads</div>';

      if (isAdmin) {
        html += '<div class="action-bar">'
          + '<button class="btn btn-primary btn-sm" onclick="LeadsPage.showForm()">+ Add Lead</button>'
          + '<button class="btn btn-outline btn-sm" onclick="LeadsPage.showImport()">📥 Import</button>'
          + '<button class="btn btn-outline btn-sm" onclick="LeadsPage.exportExcel()">📤 Export</button>'
          + '<button class="btn btn-danger btn-sm" onclick="LeadsPage.deleteAll()">🗑️ Delete All</button>'
          + '</div>';
      }

      html += '<div class="search-bar">'
        + '<input type="text" placeholder="Search leads..." id="lead-search"'
        + ' value="' + this.search + '" oninput="LeadsPage.searchLeads(this.value)">'
        + '<select onchange="LeadsPage.filterStatus(this.value)">'
        + '<option value="">All Status</option>'
        + '<option value="New"' + (this.statusFilter === 'New' ? ' selected' : '') + '>New</option>'
        + '<option value="Contacted"' + (this.statusFilter === 'Contacted' ? ' selected' : '') + '>Contacted</option>'
        + '<option value="Follow-up"' + (this.statusFilter === 'Follow-up' ? ' selected' : '') + '>Follow-up</option>'
        + '<option value="Converted"' + (this.statusFilter === 'Converted' ? ' selected' : '') + '>Converted</option>'
        + '<option value="Closed"' + (this.statusFilter === 'Closed' ? ' selected' : '') + '>Closed</option>'
        + '</select></div>';

      html += '<div class="card">';
      if (data.leads.length) {
        html += data.leads.map(function(l) {
          var actions = '<div class="flex gap-2" style="flex-shrink:0">'
            + '<button class="btn btn-icon btn-whatsapp" onclick="LeadsPage.openWhatsApp(\'' + (l.phone || l.whatsapp) + '\')" title="WhatsApp">💬</button>'
            + '<button class="btn btn-icon btn-email" onclick="LeadsPage.openEmail(\'' + (l.email || '') + '\',\'' + l.name.replace(/'/g, "\\'") + '\')" title="Email">✉️</button>'
            + '<button class="btn btn-icon btn-outline" onclick="LeadsPage.showForm(\'' + l._id + '\')">✏️</button>';
          if (isAdmin) {
            actions += '<button class="btn btn-icon btn-danger" onclick="LeadsPage.deleteLead(\'' + l._id + '\')">🗑️</button>';
          }
          actions += '</div>';

          return '<div style="padding:0.75rem;border-bottom:1px solid #2d2d4a">'
            + '<div class="flex justify-between items-start">'
            + '<div style="flex:1">'
            + '<div class="flex items-center gap-2">'
            + '<span style="font-weight:600">' + l.name + '</span> '
            + getStatusBadge(l.status)
            + '</div>'
            + '<div style="font-size:0.8rem;color:#9ca3af;margin-top:0.2rem">'
            + '📞 ' + l.phone + (l.email ? ' | ✉️ ' + l.email : '')
            + '</div>'
            + '<div style="font-size:0.8rem;color:#9ca3af;margin-top:0.1rem">'
            + 'Assigned: ' + (l.assigned_to || 'Unassigned') + ' | Contacted: ' + (l.contacted_count || 0)
            + '</div></div>'
            + actions
            + '</div></div>';
        }).join('');
      } else {
        html += '<div class="empty-state"><div class="icon">👤</div><h3>No leads found</h3></div>';
      }
      html += '</div>';

      if (data.pages > 1) {
        html += '<div class="flex justify-center gap-2" style="margin-top:1rem">'
          + '<button class="btn btn-sm btn-outline"' + (this.currentPage <= 1 ? ' disabled' : '') + ' onclick="LeadsPage.loadPage(' + (this.currentPage - 1) + ')">Prev</button>'
          + '<span style="color:#9ca3af;padding:0.5rem">' + this.currentPage + ' / ' + data.pages + '</span>'
          + '<button class="btn btn-sm btn-outline"' + (this.currentPage >= data.pages ? ' disabled' : '') + ' onclick="LeadsPage.loadPage(' + (this.currentPage + 1) + ')">Next</button>'
          + '</div>';
      }

      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">👤</div><h3>Failed to load leads</h3></div>';
    }
  },

  loadPage(page) { this.currentPage = page; App.renderPage('leads'); },
  searchLeads(value) { this.search = value; this.currentPage = 1; clearTimeout(this._timer); this._timer = setTimeout(function() { App.renderPage('leads'); }, 400); },
  filterStatus(value) { this.statusFilter = value; this.currentPage = 1; App.renderPage('leads'); },

  showForm(id) {
    showModal(id ? 'Edit Lead' : 'New Lead',
      '<form id="lead-form">'
      + '<input type="hidden" name="lead_id" value="' + (id || '') + '">'
      + '<div class="form-group"><label class="form-label">Name *</label><input type="text" name="name" required></div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Phone *</label><input type="tel" name="phone" required></div>'
      + '<div class="form-group"><label class="form-label">WhatsApp</label><input type="tel" name="whatsapp"></div>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">Email</label><input type="email" name="email"></div>'
      + '<div class="form-group"><label class="form-label">Address</label><textarea name="address"></textarea></div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Status</label><select name="status">'
      + '<option value="New">New</option><option value="Contacted">Contacted</option>'
      + '<option value="Follow-up">Follow-up</option><option value="Converted">Converted</option>'
      + '<option value="Closed">Closed</option></select></div>'
      + '<div class="form-group"><label class="form-label">Assigned To</label><input type="text" name="assigned_to" value="' + App.getUser().full_name + '"></div>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">Notes</label><textarea name="notes"></textarea></div>'
      + '<button type="submit" class="btn btn-primary btn-block">' + (id ? 'Update' : 'Add') + ' Lead</button>'
      + '</form>'
    );

    if (id) {
      API.get('/leads/' + id).then(function(res) {
        var form = document.getElementById('lead-form');
        if (!form) return;
        Object.keys(res.lead).forEach(function(key) {
          var el = form.elements[key];
          if (el) el.value = res.lead[key];
        });
      });
    }

    document.getElementById('lead-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(e.target));
      var lid = data.lead_id;
      delete data.lead_id;

      try {
        if (lid) { await API.put('/leads/' + lid, data); showToast('Lead updated'); }
        else { await API.post('/leads', data); showToast('Lead created'); }
        closeModal();
        App.renderPage('leads');
      } catch (err) { showToast(err.message, 'error'); }
    });
  },

  async deleteLead(id) {
    if (!confirm('Delete this lead?')) return;
    try { await API.delete('/leads/' + id); showToast('Lead deleted'); App.renderPage('leads'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  async deleteAll() {
    if (!confirm('⚠️ Delete ALL leads? This cannot be undone!')) return;
    if (!confirm('Are you sure? ALL leads will be permanently deleted.')) return;
    try { var res = await API.delete('/leads/delete-all'); showToast(res.message); App.renderPage('leads'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  openWhatsApp(phone) {
    var num = phone.replace(/[^0-9]/g, '');
    if (num) window.open('https://wa.me/91' + num, '_blank');
    else showToast('No phone number', 'error');
  },

  openEmail(email, name) {
    if (email) {
      var subject = encodeURIComponent('KidzVenture - Enquiry');
      var body = encodeURIComponent('Dear ' + name + ',\n\nThank you for your interest in KidzVenture.\n\n');
      window.open('mailto:' + email + '?subject=' + subject + '&body=' + body, '_blank');
    } else showToast('No email address', 'error');
  },

  showImport() {
    showModal('Import Leads',
      '<p style="color:#9ca3af;margin-bottom:1rem">Upload Excel file with columns: Name, Phone, Email, WhatsApp, Address, Status, Assigned To</p>'
      + '<form id="import-leads-form">'
      + '<div class="form-group"><input type="file" name="file" accept=".xlsx,.xls" required></div>'
      + '<button type="submit" class="btn btn-primary btn-block">Import</button></form>'
    );
    document.getElementById('import-leads-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      try {
        var res = await API.upload('/leads/import', fd);
        if (res.errors && res.errors.length) { showToast(res.message + ' | Errors: ' + res.errors.join(', '), 'error'); }
        else { showToast(res.message); }
        closeModal(); App.renderPage('leads');
      }
      catch (err) { showToast(err.message, 'error'); }
    });
  },

  async exportExcel() {
    try { var blob = await API.download('/leads/export'); downloadBlob(blob, 'leads.xlsx'); showToast('Exported successfully'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  init() {},
};
