var API_BASE = window.location.origin;
if (window.Capacitor && window.Capacitor.isNative) {
  API_BASE = 'https://kidzventure1.onrender.com';
}
const API = {
  baseUrl: API_BASE + '/api',

  async request(method, path, data = null, isFormData = false) {
    const url = this.baseUrl + path;
    const headers = {};
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (data) {
      opts.body = isFormData ? data : JSON.stringify(data);
    }

    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  },

  get(path) { return this.request('GET', path); },
  post(path, data) { return this.request('POST', path, data); },
  put(path, data) { return this.request('PUT', path, data); },
  delete(path) { return this.request('DELETE', path); },
  upload(path, formData) { return this.request('POST', path, formData, true); },
  download(path) {
    const token = localStorage.getItem('token');
    return fetch(this.baseUrl + path, {
      headers: { 'Authorization': 'Bearer ' + token },
    }).then(r => {
      if (!r.ok) throw new Error('Download failed');
      return r.blob();
    });
  },
};

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showLoading() {
  const div = document.createElement('div');
  div.className = 'loading';
  div.id = 'loading-spinner';
  div.innerHTML = '<div class="spinner"></div>';
  return div;
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getStatusBadge(status) {
  const cls = 'badge badge-' + (status || '').toLowerCase().replace(/\s+/g, '-');
  return '<span class="' + cls + '">' + (status || 'N/A') + '</span>';
}
