const LeadsPage = {
  currentPage: 1,
  search: '',
  statusFilter: '',
  employees: [],

  async render() {
    return '<div class="loading"><div class="spinner"></div></div>';
  },

  async renderLeads() {
    try {
      if (!this.employees.length) {
        try { var empRes = await API.get('/employees'); this.employees = empRes.employees || []; } catch (e) {}
      }
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
            + '<button class="btn btn-icon btn-email" onclick="LeadsPage.openEmail(\'' + (l.email || '') + '\',\'' + (l.name || '').replace(/'/g, "\\'") + '\')" title="Email">✉️</button>'
            + '<button class="btn btn-icon btn-outline" onclick="LeadsPage.showForm(\'' + l._id + '\')">✏️</button>';
          if (isAdmin) {
            actions += '<button class="btn btn-icon btn-danger" onclick="LeadsPage.deleteLead(\'' + l._id + '\')">🗑️</button>';
          }
          actions += '</div>';

          var detailLine = l.phone || '';
          if (l.email) detailLine += (detailLine ? ' | ' : '') + l.email;
          if (l.company || l.organization) detailLine += (detailLine ? ' | ' : '') + (l.company || l.organization);

          return '<div style="padding:0.75rem;border-bottom:1px solid #2d2d4a">'
            + '<div class="flex justify-between items-start">'
            + '<div style="flex:1">'
            + '<div class="flex items-center gap-2" style="flex-wrap:wrap">'
            + '<span style="font-weight:600">' + (l.name || 'Unnamed') + '</span> '
            + getStatusBadge(l.status)
            + '</div>'
            + (detailLine ? '<div style="font-size:0.8rem;color:#9ca3af;margin-top:0.2rem">' + detailLine + '</div>' : '')
            + '<div style="font-size:0.8rem;color:#9ca3af;margin-top:0.1rem">'
            + 'Assigned: ' + (l.assigned_to || 'Unassigned')
            + (l.lead_source ? ' | Source: ' + l.lead_source : '')
            + (l.city ? ' | ' + l.city : '')
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

  fieldSections: [
    {
      title: 'Basic Info', open: true,
      fields: [
        { key: 'name', label: 'Lead Name', type: 'text', required: true },
        { key: 'phone', label: 'Mobile Phone Number', type: 'tel' },
        { key: 'whatsapp', label: 'WhatsApp Number', type: 'tel' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'status', label: 'Lead Stage', type: 'select', options: ['New', 'Contacted', 'Follow-up', 'Converted', 'Closed'] },
        { key: 'assigned_to', label: 'Assigned To', type: 'text' },
        { key: 'lead_source', label: 'Lead Source', type: 'text' },
      ],
    },
    {
      title: 'Contact Numbers', open: false,
      fields: [
        { key: 'contact_number', label: 'Contact Number', type: 'tel' },
        { key: 'direct_phone', label: 'Direct Phone Number', type: 'tel' },
        { key: 'office_phone', label: 'Office Phone Number', type: 'tel' },
        { key: 'school_phone', label: 'School Phone', type: 'tel' },
        { key: 'website', label: 'Website', type: 'url' },
      ],
    },
    {
      title: 'Personal & Occupation', open: false,
      fields: [
        { key: 'designation', label: 'Designation / Title', type: 'text' },
        { key: 'role', label: 'Role', type: 'text' },
        { key: 'department', label: 'Department', type: 'text' },
        { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
        { key: 'special_event_date', label: 'Special Event Date', type: 'date' },
        { key: 'linkedin', label: 'LinkedIn', type: 'url' },
      ],
    },
    {
      title: 'School / Organization', open: false,
      fields: [
        { key: 'school_name', label: 'School Name', type: 'text' },
        { key: 'account_name', label: 'Account Name', type: 'text' },
        { key: 'account_code', label: 'Account Code', type: 'text' },
        { key: 'company', label: 'Company / Organization', type: 'text' },
        { key: 'customer_name', label: 'Customer Name', type: 'text' },
        { key: 'medium', label: 'Medium', type: 'text' },
        { key: 'potential', label: 'Potential', type: 'text' },
        { key: 'chain_of_school', label: 'Chain of School', type: 'text' },
      ],
    },
    {
      title: 'School Head', open: false,
      fields: [
        { key: 'school_head_first_name', label: 'School Head First Name', type: 'text' },
        { key: 'school_head_last_name', label: 'School Head Last Name', type: 'text' },
        { key: 'school_head_designation', label: 'School Head Designation', type: 'text' },
      ],
    },
    {
      title: 'Address', open: false,
      fields: [
        { key: 'address', label: 'Address (Full)', type: 'textarea' },
        { key: 'address_line1', label: 'Address Line 1', type: 'text' },
        { key: 'address_line2', label: 'Address Line 2', type: 'text' },
        { key: 'locality', label: 'Locality', type: 'text' },
        { key: 'place', label: 'Place', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'state', label: 'State', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'pincode', label: 'Pincode / ZIP', type: 'text' },
      ],
    },
    {
      title: 'Account & Customer Info', open: false,
      fields: [
        { key: 'account_type', label: 'Account Type', type: 'text' },
        { key: 'customer_type', label: 'Customer Type', type: 'text' },
        { key: 'account_status', label: 'Account Status', type: 'text' },
        { key: 'inactive_reason', label: 'Inactive Reason', type: 'text' },
        { key: 'do_not_contact_reason', label: 'Do Not Contact Reason', type: 'text' },
        { key: 'type', label: 'Type', type: 'text' },
        { key: 'customer_group', label: 'Customer Group', type: 'text' },
        { key: 'product_groups', label: 'Product Groups', type: 'text' },
        { key: 'tags', label: 'Tags', type: 'text' },
      ],
    },
    {
      title: 'Lead Management', open: false,
      fields: [
        { key: 'lead_stage', label: 'Lead Stage', type: 'text' },
        { key: 'data_source', label: 'Data Source', type: 'text' },
        { key: 'list_name', label: 'List Name', type: 'text' },
        { key: 'deal_size', label: 'Deal Size (INR)', type: 'number' },
        { key: 'next_followup_date', label: 'Next Follow-up Date', type: 'date' },
        { key: 'repeat_followup', label: 'Repeat Follow-up', type: 'text' },
        { key: 'do_not_followup', label: 'Do Not Follow-up', type: 'text' },
        { key: 'do_not_followup_reason', label: 'Do Not Follow-up Reason', type: 'text' },
        { key: 'account_owner', label: 'Account Owner / TM / AM', type: 'text' },
        { key: 'training_manager', label: 'Training Manager (Co-Owner 1)', type: 'text' },
        { key: 'academic_manager', label: 'Academic Manager (Co-Owner 2)', type: 'text' },
        { key: 'sales_manager', label: 'Sales Manager (Co-Owner 3)', type: 'text' },
      ],
    },
    {
      title: 'Kreedo Implementation', open: false,
      fields: [
        { key: 'kreedo_implementation_status', label: 'Kreedo Implementation Status', type: 'text' },
        { key: 'kreedo_phase', label: 'Kreedo Phase', type: 'text' },
        { key: 'renewal_status', label: 'Renewal Status', type: 'text' },
        { key: 'not_under_implementation_reason', label: 'Not Under Implementation Reason', type: 'text' },
        { key: 'package_name', label: 'Package Name', type: 'text' },
        { key: 'preprimary_package_dispatched', label: 'Pre-Primary Package Material Dispatched', type: 'text' },
        { key: 'material_dispatch_date', label: 'Material Dispatch Date', type: 'date' },
      ],
    },
    {
      title: 'Tracking & Notes', open: false,
      fields: [
        { key: 'last_contacted_date', label: 'Last Contacted Date', type: 'date' },
        { key: 'followup_notes', label: 'Follow-up Notes', type: 'textarea' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
        { key: 'lead_notes', label: 'Lead Notes', type: 'textarea' },
        { key: 'organization_notes', label: 'Organization Notes', type: 'textarea' },
        { key: 'last_comment', label: 'Last Comment', type: 'textarea' },
        { key: 'comment_posted_by', label: 'Comment Posted By', type: 'text' },
        { key: 'comment_posted_on', label: 'Comment Posted On', type: 'text' },
      ],
    },
    {
      title: 'Reference URLs', open: false,
      fields: [
        { key: 'reference_url1', label: 'Reference URL 1', type: 'url' },
        { key: 'reference_url2', label: 'Reference URL 2', type: 'url' },
        { key: 'reference_url3', label: 'Reference URL 3', type: 'url' },
      ],
    },
  ],

  renderFormFields(lead) {
    var html = '';
    for (var si = 0; si < this.fieldSections.length; si++) {
      var sec = this.fieldSections[si];
      html += '<details' + (sec.open ? ' open' : '') + ' style="margin-bottom:0.5rem">'
        + '<summary style="cursor:pointer;font-weight:600;padding:0.5rem 0;color:#818cf8">' + sec.title + '</summary>'
        + '<div style="padding:0.5rem 0">';
      for (var fi = 0; fi < sec.fields.length; fi++) {
        var f = sec.fields[fi];
        var val = lead ? (lead[f.key] || '') : '';
        html += '<div class="form-group"><label class="form-label">' + f.label + '</label>';
        if (f.type === 'select') {
          html += '<select name="' + f.key + '">';
          for (var oi = 0; oi < f.options.length; oi++) {
            var o = f.options[oi];
            html += '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>';
          }
          html += '</select>';
        } else if (f.type === 'textarea') {
          html += '<textarea name="' + f.key + '"' + (f.required ? ' required' : '') + '>' + val + '</textarea>';
        } else {
          html += '<input type="' + f.type + '" name="' + f.key + '" value="' + val.replace(/"/g, '&quot;') + '"' + (f.required ? ' required' : '') + '>';
        }
        html += '</div>';
      }
      html += '</div></details>';
    }
    return html;
  },

  showForm(id) {
    var empNames = this.employees.map(function(e) { return e.full_name; });

    for (var si = 0; si < this.fieldSections.length; si++) {
      var sec = this.fieldSections[si];
      for (var fi = 0; fi < sec.fields.length; fi++) {
        if (sec.fields[fi].key === 'assigned_to') {
          sec.fields[fi].type = 'select';
          sec.fields[fi].options = empNames;
          break;
        }
      }
    }

    var title = id ? 'Edit Lead' : 'New Lead';
    var formHtml = '<form id="lead-form">'
      + '<input type="hidden" name="lead_id" value="' + (id || '') + '">'
      + this.renderFormFields(null)
      + '<button type="submit" class="btn btn-primary btn-block" style="margin-top:0.5rem">' + (id ? 'Update' : 'Add') + ' Lead</button>'
      + '</form>';
    showModal(title, formHtml, true, 'wide');

    if (id) {
      API.get('/leads/' + id).then(function(res) {
        var form = document.getElementById('lead-form');
        if (!form) return;
        Object.keys(res.lead).forEach(function(key) {
          if (key === '_id' || key === 'lead_id') return;
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
      for (var k in data) { if (data[k] === '') data[k] = ''; }

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
    var num = (phone || '').replace(/[^0-9]/g, '');
    if (num) openExternalUrl('https://wa.me/91' + num);
    else showToast('No phone number', 'error');
  },

  openEmail(email, name) {
    if (email) {
      var subject = encodeURIComponent('KidzVenture - Enquiry');
      var body = encodeURIComponent('Dear ' + name + ',\n\nThank you for your interest in KidzVenture.\n\n');
      openExternalUrl('mailto:' + email + '?subject=' + subject + '&body=' + body);
    } else showToast('No email address', 'error');
  },

  showImport() {
    showModal('Import Leads',
      '<p style="color:#9ca3af;margin-bottom:1rem">Upload Excel file. Headers matching field names will be imported automatically.</p>'
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

  async init() {
    try { var empRes = await API.get('/employees'); this.employees = empRes.employees || []; } catch (e) {}
  },
};
