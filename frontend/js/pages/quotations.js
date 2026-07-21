var QuotationsPage = {
  currentPage: 1,
  search: '',
  _productsCache: [],

  async render() {
    return '<div class="loading"><div class="spinner"></div></div>';
  },

  async renderQuotations() {
    try {
      var params = new URLSearchParams({ page: this.currentPage, limit: 50 });
      if (this.search) params.set('search', this.search);

      var data = await API.get('/quotations?' + params.toString());
      var isAdmin = App.getUser().role === 'admin';

      var html = '<div class="page-title">Quotations</div>'
        + '<div class="action-bar">'
        + '<button class="btn btn-primary btn-sm" onclick="QuotationsPage.showForm()">+ New Quotation</button>';
      if (isAdmin) {
        html += '<button class="btn btn-outline btn-sm" onclick="QuotationsPage.exportExcel()">📤 Export</button>';
      }
      html += '</div>'
        + '<div class="search-bar">'
        + '<input type="text" placeholder="Search quotations..." id="qtn-search"'
        + ' value="' + this.search + '" oninput="QuotationsPage.searchQuotations(this.value)">'
        + '</div>'
        + '<div class="card"><div class="table-container"><table><thead><tr>'
        + '<th>#</th><th>Customer</th><th>Amount</th><th>Status</th><th>Actions</th>'
        + '</tr></thead><tbody>';

      if (data.quotations.length) {
        html += data.quotations.map(function(q) {
          return '<tr>'
            + '<td style="font-size:0.8rem;color:#9ca3af">' + q.quotation_no + '</td>'
            + '<td><div style="font-weight:600">' + q.customer_name + '</div>'
            + '<div style="font-size:0.75rem;color:#9ca3af">' + (q.customer_phone || '') + '</div></td>'
            + '<td style="font-weight:600">' + formatCurrency(q.grand_total) + '</td>'
            + '<td><select class="status-select" onchange="QuotationsPage.updateStatus(\'' + q._id + '\', this.value)">'
            + ['Draft', 'Sent', 'Approved', 'Rejected'].map(function(s) {
                return '<option value="' + s + '"' + (q.status === s ? ' selected' : '') + '>' + s + '</option>';
              }).join('')
            + '</select></td>'
            + '<td><button class="btn btn-sm btn-outline" onclick="QuotationsPage.showForm(\'' + q._id + '\')">✏️</button>'
            + '<button class="btn btn-sm btn-outline" onclick="QuotationsPage.printQuotation(\'' + q._id + '\')">🖨️</button>'
            + '<button class="btn btn-sm btn-danger" onclick="QuotationsPage.deleteQuotation(\'' + q._id + '\')">🗑️</button></td>'
            + '</tr>';
        }).join('');
      } else {
        html += '<tr><td colspan="5" class="text-center">No quotations found</td></tr>';
      }

      html += '</tbody></table></div></div>';

      if (data.pages > 1) {
        html += '<div class="flex justify-center gap-2" style="margin-top:1rem">'
          + '<button class="btn btn-sm btn-outline"' + (this.currentPage <= 1 ? ' disabled' : '') + ' onclick="QuotationsPage.loadPage(' + (this.currentPage - 1) + ')">Prev</button>'
          + '<span style="color:#9ca3af;padding:0.5rem">' + this.currentPage + ' / ' + data.pages + '</span>'
          + '<button class="btn btn-sm btn-outline"' + (this.currentPage >= data.pages ? ' disabled' : '') + ' onclick="QuotationsPage.loadPage(' + (this.currentPage + 1) + ')">Next</button>'
          + '</div>';
      }

      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">📄</div><h3>Failed to load quotations</h3></div>';
    }
  },

  loadPage(page) { this.currentPage = page; App.renderPage('quotations'); },
  searchQuotations(value) { this.search = value; this.currentPage = 1; clearTimeout(this._timer); this._timer = setTimeout(function() { App.renderPage('quotations'); }, 400); },

  async showForm(id) {
    if (!this._productsCache.length) {
      try { var res = await API.get('/products?limit=200'); this._productsCache = res.products; }
      catch (e) { this._productsCache = []; }
    }

    var items = [{ name: '', qty: 1, price: 0 }];
    var customerName = '', customerPhone = '', customerEmail = '';
    var discount = 0, tax = 0;

    if (id) {
      try {
        var res = await API.get('/quotations/' + id);
        var q = res.quotation;
        customerName = q.customer_name;
        customerPhone = q.customer_phone;
        customerEmail = q.customer_email;
        items = q.items;
        discount = q.discount || 0;
        tax = q.tax || 0;
      } catch (e) {}
    }

    showModal(id ? 'Edit Quotation' : 'New Quotation',
      '<form id="quotation-form">'
      + '<input type="hidden" name="quotation_id" value="' + (id || '') + '">'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Customer Name *</label><input type="text" name="customer_name" value="' + customerName + '" required></div>'
      + '<div class="form-group"><label class="form-label">Phone</label><input type="tel" name="customer_phone" value="' + customerPhone + '"></div>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">Email</label><input type="email" name="customer_email" value="' + customerEmail + '"></div>'
      + '<div class="form-group"><label class="form-label">Items</label>'
      + '<div id="items-container"></div>'
      + '<button type="button" class="btn btn-sm btn-outline mt-2" onclick="QuotationsPage.addItem()">+ Add Item</button>'
      + '<button type="button" class="btn btn-sm btn-outline mt-2" onclick="QuotationsPage.addFromProducts()">📦 From Products</button>'
      + '</div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Discount (₹)</label><input type="number" step="0.01" name="discount" value="' + discount + '" oninput="QuotationsPage.calcTotal()"></div>'
      + '<div class="form-group"><label class="form-label">Tax (₹)</label><input type="number" step="0.01" name="tax" value="' + tax + '" oninput="QuotationsPage.calcTotal()"></div>'
      + '</div>'
      + '<div style="text-align:right;padding:0.5rem 0;font-size:1.1rem;font-weight:700">Total: <span id="qtn-total">₹0.00</span></div>'
      + '<button type="submit" class="btn btn-primary btn-block">' + (id ? 'Update' : 'Create') + ' Quotation</button>'
      + '</form>',
      true, 'wide'
    );

    var container = document.getElementById('items-container');
    if (container) {
      items.forEach(function(item, i) { QuotationsPage.renderItemRow(container, item, i); });
      this.calcTotal();
    }

    document.getElementById('quotation-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      var form = e.target;
      var data = {
        customer_name: form.customer_name.value,
        customer_phone: form.customer_phone.value,
        customer_email: form.customer_email.value,
        discount: parseFloat(form.discount.value) || 0,
        tax: parseFloat(form.tax.value) || 0,
        items: QuotationsPage.collectItems(),
      };
      if (!data.items.length) { showToast('Add at least one item', 'error'); return; }

      var qid = form.quotation_id.value;
      try {
        if (qid) { await API.put('/quotations/' + qid, data); showToast('Quotation updated'); }
        else { await API.post('/quotations', data); showToast('Quotation created'); }
        closeModal(); App.renderPage('quotations');
      } catch (err) { showToast(err.message, 'error'); }
    });
  },

  renderItemRow(container, item, i) {
    var prods = this._productsCache;
    var div = document.createElement('div');
    div.className = 'item-row';

    var opts = '<option value="">-- Select Product --</option>';
    prods.forEach(function(p) {
      var sel = p._id === (item.product_id || '') ? ' selected' : '';
      var label = p.name || p.sku || ('# ' + p._id);
      opts += '<option value="' + p._id + '" data-price="' + (p.selling_price || p.price) + '"' + sel + '>' + label + '</option>';
    });

    div.innerHTML = '<select onchange="QuotationsPage.onProductSelect(this)">' + opts + '</select>'
      + '<input type="number" class="item-qty" value="' + item.qty + '" min="1" oninput="QuotationsPage.calcTotal()">'
      + '<input type="number" step="0.01" class="item-price" value="' + item.price + '" oninput="QuotationsPage.calcTotal()">'
      + '<span class="item-total" style="font-weight:600;text-align:right">₹0</span>'
      + '<button type="button" class="btn btn-icon btn-danger btn-sm" onclick="this.closest(\'.item-row\').remove();QuotationsPage.calcTotal()">×</button>';

    container.appendChild(div);
    this.updateItemRow(div, item);
    this.calcTotal();
  },

  onProductSelect(select) {
    var opt = select.options[select.selectedIndex];
    var row = select.closest('.item-row');
    if (opt.value) { row.querySelector('.item-price').value = opt.dataset.price; }
    this.calcTotal();
  },

  updateItemRow(row, item) {
    if (item.name) {
      var select = row.querySelector('select');
      if (select && !select.value) {
        var opt = document.createElement('option');
        opt.value = item.product_id || '';
        opt.text = item.name;
        opt.selected = true;
        opt.dataset.price = item.price;
        select.add(opt);
      }
    }
    row.querySelector('.item-qty').value = item.qty;
    row.querySelector('.item-price').value = item.price;
  },

  addItem() {
    var container = document.getElementById('items-container');
    if (container) this.renderItemRow(container, { name: '', qty: 1, price: 0 }, container.children.length);
  },

  addFromProducts() {
    var prods = this._productsCache;
    var container = document.getElementById('items-container');
    if (!container) return;

    if (!prods || !prods.length) {
      showToast('No products found. Add products first.', 'error');
      return;
    }

    var listHtml = '<div style="max-height:50vh;overflow-y:auto">';
    prods.forEach(function(p) {
      var displayName = p.name || p.sku || ('Product #' + p._id);
      var val = JSON.stringify({ product_id: p._id, name: displayName, price: p.selling_price || p.price || 0 });
      listHtml += '<label style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;border-bottom:1px solid #2d2d4a;cursor:pointer">'
        + '<input type="checkbox" class="prod-select" value=\'' + val + '\'>'
        + '<div><div style="font-weight:600">' + displayName + '</div>'
        + '<div style="font-size:0.75rem;color:#9ca3af">' + (p.sku ? p.sku + ' | ' : '') + formatCurrency(p.selling_price || p.price || 0) + '</div></div>'
        + '</label>';
    });
    listHtml += '</div>'
      + '<div class="flex gap-2 mt-2">'
      + '<button type="button" class="btn btn-primary btn-block" onclick="QuotationsPage.addSelectedProducts()">Add Selected</button>'
      + '<button type="button" class="btn btn-danger" onclick="closeModal()">Cancel</button>'
      + '</div>';

    showModal('Select Products (' + prods.length + ' items)', listHtml, true, 'wide');
  },

  addSelectedProducts() {
    var checks = document.querySelectorAll('.prod-select:checked');
    var container = document.getElementById('items-container');
    if (!container) return;
    checks.forEach(function(c) {
      var p = JSON.parse(c.value);
      QuotationsPage.renderItemRow(container, { product_id: p.product_id, name: p.name, qty: 1, price: p.price }, container.children.length);
    });
    closeModal();
  },

  collectItems() {
    var rows = document.querySelectorAll('.item-row');
    return Array.from(rows).map(function(row) {
      var select = row.querySelector('select');
      var name = select ? (select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : '') : '';
      var qty = parseFloat(row.querySelector('.item-qty').value) || 1;
      var price = parseFloat(row.querySelector('.item-price').value) || 0;
      return { product_id: select ? select.value : '', name: name, qty: qty, price: price, total: qty * price };
    }).filter(function(i) { return i.name || i.price; });
  },

  calcTotal() {
    var items = this.collectItems();
    var subtotal = items.reduce(function(s, i) { return s + i.total; }, 0);
    var discount = parseFloat(document.querySelector('[name="discount"]')?.value) || 0;
    var tax = parseFloat(document.querySelector('[name="tax"]')?.value) || 0;
    var total = subtotal - discount + tax;

    var totals = document.querySelectorAll('.item-total');
    items.forEach(function(item, idx) {
      if (totals[idx]) totals[idx].textContent = formatCurrency(item.total);
    });

    var el = document.getElementById('qtn-total');
    if (el) el.textContent = formatCurrency(total);
  },

  async deleteQuotation(id) {
    if (!confirm('Delete this quotation?')) return;
    try { await API.delete('/quotations/' + id); showToast('Quotation deleted'); App.renderPage('quotations'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  async updateStatus(id, status) {
    try { await API.put('/quotations/' + id, { status: status }); showToast('Status updated to ' + status); }
    catch (err) { showToast(err.message, 'error'); App.renderPage('quotations'); }
  },

  async printQuotation(id) {
    try {
      var blob = await API.download('/quotations/' + id + '/pdf');
      downloadBlob(blob, 'Quotation-' + id + '.pdf');
    } catch (err) { showToast(err.message, 'error'); }
  },

  async exportExcel() {
    try { var blob = await API.download('/quotations/export'); downloadBlob(blob, 'quotations.xlsx'); showToast('Exported successfully'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  init() {},
};
