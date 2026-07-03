var AttendancePage = {
  async render() {
    var user = App.getUser();
    try {
      var data = await API.get('/attendance');
      var today = await API.get('/attendance/today');

      var html = '<div class="page-title">Attendance</div>';

      if (user.role === 'employee') {
        var statusText = today.checked_in ? (today.checked_out ? '✅ Completed' : '⏳ Working') : '❌ Not Checked In';
        var statusColor = today.checked_in ? '#10b981' : '#ef4444';
        html += '<div class="card text-center">'
          + '<div class="card-title mb-2">Today</div>'
          + '<div style="font-size:2rem;font-weight:800;color:' + statusColor + '">' + statusText + '</div>'
          + '<div class="flex justify-center gap-3 mt-2">'
          + '<button class="btn ' + (today.checked_in ? 'btn-success' : 'btn-primary') + '" id="att-check-in"' + (today.checked_in ? ' disabled' : '') + '>Check In</button>'
          + '<button class="btn ' + (today.checked_out ? 'btn-success' : 'btn-primary') + '" id="att-check-out"' + (!today.checked_in || today.checked_out ? ' disabled' : '') + '>Check Out</button>'
          + '</div>';
        if (today.record) {
          html += '<div style="font-size:0.85rem;color:#9ca3af;margin-top:0.5rem">In: ' + (today.record.check_in || '-') + ' | Out: ' + (today.record.check_out || '-') + '</div>';
        }
        html += '</div>';
      }

      var cols = user.role === 'admin' ? 5 : 4;
      html += '<div class="card"><div class="card-header"><div class="card-title">History</div></div>'
        + '<div class="table-container"><table><thead><tr><th>Date</th>'
        + (user.role === 'admin' ? '<th>Employee</th>' : '')
        + '<th>In</th><th>Out</th><th>Status</th></tr></thead><tbody>';

      if (data.records.length) {
        html += data.records.map(function(r) {
          var empCol = user.role === 'admin' ? '<td>' + r.user_name + '</td>' : '';
          return '<tr><td>' + formatDate(r.date) + '</td>' + empCol + '<td>' + (r.check_in || '-') + '</td><td>' + (r.check_out || '-') + '</td><td>' + getStatusBadge(r.check_in ? 'present' : 'absent') + '</td></tr>';
        }).join('');
      } else {
        html += '<tr><td colspan="' + cols + '" class="text-center">No records</td></tr>';
      }

      html += '</tbody></table></div></div>';
      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">📋</div><h3>Failed to load attendance</h3></div>';
    }
  },

  init() {
    var checkIn = document.getElementById('att-check-in');
    var checkOut = document.getElementById('att-check-out');
    if (checkIn) {
      checkIn.addEventListener('click', async function() {
        try { await API.post('/attendance/check-in'); showToast('Checked in!'); App.renderPage('attendance'); }
        catch (err) { showToast(err.message, 'error'); }
      });
    }
    if (checkOut) {
      checkOut.addEventListener('click', async function() {
        try { await API.post('/attendance/check-out'); showToast('Checked out!'); App.renderPage('attendance'); }
        catch (err) { showToast(err.message, 'error'); }
      });
    }
  },
};
