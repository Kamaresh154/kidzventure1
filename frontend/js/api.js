var API_BASE = window.location.origin;
var hostname = window.location.hostname;
// Capacitor serves from https://localhost with androidScheme:"https"
// Detect: served from localhost but NOT local dev (port 5000 or http)
var isCapacitor = hostname === 'localhost' && (window.location.protocol === 'https:' || window.location.port === '');
if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') isCapacitor = true;
if (window.location.origin === 'null') isCapacitor = true;
if (navigator && navigator.userAgent && navigator.userAgent.indexOf('Capacitor') !== -1) isCapacitor = true;
if (isCapacitor) {
  API_BASE = 'https://kidzventure1.onrender.com';
}
console.log('API: isCapacitor=' + isCapacitor + ' hostname=' + hostname + ' protocol=' + window.location.protocol + ' base=' + API_BASE);

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
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      showToast('API error: ' + url + ' returned ' + contentType + ' (status ' + res.status + ')', 'error');
      throw new Error('Expected JSON but got ' + contentType.substring(0, 30));
    }
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

function openExternalUrl(url) {
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.Browser) {
    window.Capacitor.Plugins.Browser.open({ url: url }).catch(function () {
      window.open(url, '_blank');
    });
  } else {
    window.open(url, '_blank');
  }
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

async function downloadBlob(blob, filename) {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
    try {
      const reader = new FileReader();
      const b64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const saved = await Capacitor.Plugins.Filesystem.writeFile({
        path: filename,
        data: b64,
        directory: 'CACHE',
      });
      await Capacitor.Plugins.Share.share({
        title: filename,
        text: 'Exported file',
        url: saved.uri,
        dialogTitle: 'Save or share ' + filename,
      });
      showToast('Exported successfully');
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
    }
    return;
  }
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
