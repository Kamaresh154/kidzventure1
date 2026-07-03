var LeavesPage = {
  async render() {
    var user = App.getUser();
    try {
      var data = await API.get('/leaves');
      var isAdmin = user.role === 'admin';

      var html = '<div class="page-title">Leave Requests</div>'
        + '<div class="action-bar"><button class="btn btn-primary btn-sm" onclick="LeavesPage.showForm()">+ Apply Leave</button></div>'
        + '<div class="card">';

      if (data.leaves.length) {
        html += data.leaves.map(function(l) {
          var actions = '<div class="flex gap-2">';
          if (isAdmin && l.status === 'Pending') {
            actions += '<button class="btn btn-sm btn-success" onclick="LeavesPage.approve(\'' + l._id + '\')">✓</button>'
              + '<button class="btn btn-sm btn-danger" onclick="LeavesPage.reject(\'' + l._id + '\')">✗</button>';
          }
          if (user.role === 'employee' && l.status === 'Pending') {
            actions += '<button class="btn btn-sm btn-danger" onclick="LeavesPage.cancel(\'' + l._id + '\')">Cancel</button>';
          }
          actions += '</div>';

          return '<div style="padding:0.75rem;border-bottom:1px solid #2d2d4a">'
            + '<div class="flex justify-between items-start">'
            + '<div><div class="flex items-center gap-2"><span style="font-weight:600">' + l.leave_type + ' Leave</span>' + getStatusBadge(l.status) + '</div>'
            + '<div style="font-size:0.85rem;color:#9ca3af;margin-top:0.2rem">' + l.user_name + ' | ' + formatDate(l.from_date) + ' - ' + formatDate(l.to_date) + '</div>'
            + '<div style="font-size:0.8rem;color:#6b7280;margin-top:0.2rem">' + l.reason + '</div></div>'
            + actions + '</div></div>';
        }).join('');
      } else {
        html += '<div class="empty-state"><div class="icon">📅</div><h3>No leave requests</h3></div>';
      }

      html += '</div>';
      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">📅</div><h3>Failed to load leaves</h3></div>';
    }
  },

  showForm() {
    showModal('Apply Leave',
      '<form id="leave-form">'
      + '<div class="form-group"><label class="form-label">Leave Type</label><select name="leave_type">'
      + '<option value="Sick">Sick Leave</option><option value="Casual">Casual Leave</option>'
      + '<option value="Annual">Annual Leave</option><option value="Other">Other</option></select></div>'
      + '<div class="form-row"><div class="form-group"><label class="form-label">From Date *</label><input type="date" name="from_date" required></div>'
      + '<div class="form-group"><label class="form-label">To Date *</label><input type="date" name="to_date" required></div></div>'
      + '<div class="form-group"><label class="form-label">Reason *</label><textarea name="reason" required></textarea></div>'
      + '<button type="submit" class="btn btn-primary btn-block">Submit</button></form>'
    );
    document.getElementById('leave-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(e.target));
      try { await API.post('/leaves', data); showToast('Leave applied'); closeModal(); App.renderPage('leaves'); }
      catch (err) { showToast(err.message, 'error'); }
    });
  },

  async approve(id) {
    try { await API.post('/leaves/' + id + '/approve'); showToast('Leave approved'); App.renderPage('leaves'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  async reject(id) {
    try { await API.post('/leaves/' + id + '/reject'); showToast('Leave rejected'); App.renderPage('leaves'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  async cancel(id) {
    if (!confirm('Cancel this leave request?')) return;
    try { await API.delete('/leaves/' + id); showToast('Leave cancelled'); App.renderPage('leaves'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  init() {},
};
