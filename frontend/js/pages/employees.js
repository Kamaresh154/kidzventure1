var EmployeesPage = {
  async render() {
    var user = App.getUser();
    if (user.role !== 'admin') return '<div class="empty-state"><div class="icon">🔒</div><h3>Access restricted to Admin</h3></div>';

    try {
      var data = await API.get('/employees');
      var html = '<div class="page-title">Employees</div>'
        + '<div class="action-bar"><button class="btn btn-primary btn-sm" onclick="EmployeesPage.showForm()">+ Add Employee</button></div>'
        + '<div class="card"><div class="table-container"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

      if (data.employees.length) {
        html += data.employees.map(function(e) {
          var status = e.is_active ? '<span style="color:#10b981">Active</span>' : '<span style="color:#ef4444">Inactive</span>';
          return '<tr><td style="font-weight:600">' + e.full_name + '</td>'
            + '<td style="color:#9ca3af;font-size:0.85rem">' + e.email + '</td>'
            + '<td>' + (e.phone || '-') + '</td>'
            + '<td>' + status + '</td>'
            + '<td><button class="btn btn-sm btn-outline" onclick="EmployeesPage.showForm(\'' + e._id + '\')">✏️</button>'
            + '<button class="btn btn-sm btn-danger" onclick="EmployeesPage.deleteEmp(\'' + e._id + '\')">🗑️</button></td></tr>';
        }).join('');
      } else {
        html += '<tr><td colspan="5" class="text-center">No employees</td></tr>';
      }

      html += '</tbody></table></div></div>';
      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">👥</div><h3>Failed to load employees</h3></div>';
    }
  },

  showForm(id) {
    showModal(id ? 'Edit Employee' : 'Add Employee',
      '<form id="emp-form">'
      + '<input type="hidden" name="emp_id" value="' + (id || '') + '">'
      + '<div class="form-group"><label class="form-label">Full Name *</label><input type="text" name="full_name" required></div>'
      + '<div class="form-group"><label class="form-label">Email *</label><input type="email" name="email"' + (id ? ' disabled' : ' required') + '></div>'
      + '<div class="form-group"><label class="form-label">Phone</label><input type="tel" name="phone"></div>'
      + '<div class="form-group"><label class="form-label">Password' + (id ? ' (leave blank to keep same)' : '') + '</label>'
      + '<input type="password" name="password"' + (id ? '' : ' placeholder="Default: employee123"') + '></div>'
      + (id
        ? '<div class="form-group"><label class="form-label">Active</label><select name="is_active"><option value="true">Active</option><option value="false">Inactive</option></select></div>'
        : '')
      + '<button type="submit" class="btn btn-primary btn-block">' + (id ? 'Update' : 'Add') + ' Employee</button></form>'
    );

    if (id) {
      API.get('/employees').then(function(res) {
        var emp = res.employees.find(function(e) { return e._id === id; });
        if (!emp) return;
        var form = document.getElementById('emp-form');
        if (!form) return;
        form.full_name.value = emp.full_name;
        form.email.value = emp.email;
        form.phone.value = emp.phone || '';
        if (form.is_active) form.is_active.value = emp.is_active ? 'true' : 'false';
      });
    }

    document.getElementById('emp-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(e.target));
      var eid = data.emp_id;
      delete data.emp_id;
      try {
        if (eid) {
          if (data.is_active) data.is_active = data.is_active === 'true';
          await API.put('/employees/' + eid, data); showToast('Employee updated');
        } else {
          await API.post('/employees', data); showToast('Employee added');
        }
        closeModal(); App.renderPage('employees');
      } catch (err) { showToast(err.message, 'error'); }
    });
  },

  async deleteEmp(id) {
    if (!confirm('Delete this employee?')) return;
    try { await API.delete('/employees/' + id); showToast('Employee deleted'); App.renderPage('employees'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  init() {},
};
