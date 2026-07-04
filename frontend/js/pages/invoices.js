var InvoicesPage = {
  currentPage: 1,
  search: '',
  statusFilter: '',
  _productsCache: [],

  async render() {
    return '<div class="loading"><div class="spinner"></div></div>';
  },

  async renderInvoices() {
    try {
      var params = new URLSearchParams({ page: this.currentPage, limit: 50 });
      if (this.search) params.set('search', this.search);
      if (this.statusFilter) params.set('status', this.statusFilter);

      var data = await API.get('/invoices?' + params.toString());
      var isAdmin = App.getUser().role === 'admin';

      var html = '<div class="page-title">Invoices</div>'
        + '<div class="action-bar">'
        + '<button class="btn btn-primary btn-sm" onclick="InvoicesPage.showForm()">+ New Invoice</button>';
      if (isAdmin) {
        html += '<button class="btn btn-outline btn-sm" onclick="InvoicesPage.exportExcel()">📤 Export</button>';
      }
      html += '</div>'
        + '<div class="search-bar">'
        + '<input type="text" placeholder="Search invoices..." id="inv-search"'
        + ' value="' + this.search + '" oninput="InvoicesPage.searchInvoices(this.value)">'
        + '<select onchange="InvoicesPage.filterStatus(this.value)">'
        + '<option value="">All</option>'
        + '<option value="Paid"' + (this.statusFilter === 'Paid' ? ' selected' : '') + '>Paid</option>'
        + '<option value="Unpaid"' + (this.statusFilter === 'Unpaid' ? ' selected' : '') + '>Unpaid</option>'
        + '<option value="Partial"' + (this.statusFilter === 'Partial' ? ' selected' : '') + '>Partial</option>'
        + '</select></div>'
        + '<div class="card"><div class="table-container"><table><thead><tr>'
        + '<th>#</th><th>Customer</th><th>Amount</th><th>Paid</th><th>Status</th><th>Actions</th>'
        + '</tr></thead><tbody>';

      if (data.invoices.length) {
        html += data.invoices.map(function(inv) {
          var statusClass = 'badge-' + (inv.payment_status || '').toLowerCase();
          return '<tr>'
            + '<td style="font-size:0.8rem;color:#9ca3af">' + inv.invoice_no + '</td>'
            + '<td><div style="font-weight:600">' + inv.customer_name + '</div>'
            + '<div style="font-size:0.75rem;color:#9ca3af">' + (inv.customer_phone || '') + '</div></td>'
            + '<td style="font-weight:600">' + formatCurrency(inv.grand_total) + '</td>'
            + '<td>' + formatCurrency(inv.amount_paid || 0) + '</td>'
            + '<td><span class="badge ' + statusClass + '">' + inv.payment_status + '</span></td>'
            + '<td><button class="btn btn-sm btn-outline" onclick="InvoicesPage.showForm(\'' + inv._id + '\')">✏️</button>'
            + '<button class="btn btn-sm btn-outline" onclick="InvoicesPage.printInvoice(\'' + inv._id + '\')">🖨️</button>'
            + '<button class="btn btn-sm btn-danger" onclick="InvoicesPage.deleteInvoice(\'' + inv._id + '\')">🗑️</button></td>'
            + '</tr>';
        }).join('');
      } else {
        html += '<tr><td colspan="6" class="text-center">No invoices found</td></tr>';
      }

      html += '</tbody></table></div></div>';

      if (data.pages > 1) {
        html += '<div class="flex justify-center gap-2" style="margin-top:1rem">'
          + '<button class="btn btn-sm btn-outline"' + (this.currentPage <= 1 ? ' disabled' : '') + ' onclick="InvoicesPage.loadPage(' + (this.currentPage - 1) + ')">Prev</button>'
          + '<span style="color:#9ca3af;padding:0.5rem">' + this.currentPage + ' / ' + data.pages + '</span>'
          + '<button class="btn btn-sm btn-outline"' + (this.currentPage >= data.pages ? ' disabled' : '') + ' onclick="InvoicesPage.loadPage(' + (this.currentPage + 1) + ')">Next</button>'
          + '</div>';
      }

      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">📄</div><h3>Failed to load invoices</h3></div>';
    }
  },

  loadPage(page) { this.currentPage = page; App.renderPage('invoices'); },
  searchInvoices(value) { this.search = value; this.currentPage = 1; clearTimeout(this._timer); this._timer = setTimeout(function() { App.renderPage('invoices'); }, 400); },
  filterStatus(value) { this.statusFilter = value; this.currentPage = 1; App.renderPage('invoices'); },

  async showForm(id) {
    if (!this._productsCache.length) {
      try { var res = await API.get('/products?limit=200'); this._productsCache = res.products; }
      catch (e) { this._productsCache = []; }
    }

    var items = [{ name: '', qty: 1, price: 0 }];
    var customerName = '', customerPhone = '', customerEmail = '', customerAddress = '';
    var discount = 0, tax = 0, amountPaid = 0, paymentMethod = 'Cash', dueDate = '', notes = '';

    if (id) {
      try {
        var res = await API.get('/invoices/' + id);
        var inv = res.invoice;
        customerName = inv.customer_name;
        customerPhone = inv.customer_phone;
        customerEmail = inv.customer_email;
        customerAddress = inv.customer_address || '';
        items = inv.items;
        discount = inv.discount || 0;
        tax = inv.tax || 0;
        amountPaid = inv.amount_paid || 0;
        paymentMethod = inv.payment_method || 'Cash';
        dueDate = inv.due_date || '';
        notes = inv.notes || '';
      } catch (e) {}
    }

    showModal(id ? 'Edit Invoice' : 'New Invoice',
      '<form id="invoice-form">'
      + '<input type="hidden" name="invoice_id" value="' + (id || '') + '">'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Customer Name *</label><input type="text" name="customer_name" value="' + customerName + '" required></div>'
      + '<div class="form-group"><label class="form-label">Phone</label><input type="tel" name="customer_phone" value="' + customerPhone + '"></div>'
      + '</div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Email</label><input type="email" name="customer_email" value="' + customerEmail + '"></div>'
      + '<div class="form-group"><label class="form-label">Due Date</label><input type="date" name="due_date" value="' + dueDate + '"></div>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">Address</label><textarea name="customer_address">' + customerAddress + '</textarea></div>'
      + '<div class="form-group"><label class="form-label">Items</label>'
      + '<div id="inv-items-container"></div>'
      + '<button type="button" class="btn btn-sm btn-outline mt-2" onclick="InvoicesPage.addItem()">+ Add Item</button>'
      + '<button type="button" class="btn btn-sm btn-outline mt-2" onclick="InvoicesPage.addFromProducts()">📦 From Products</button>'
      + '</div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Discount (₹)</label><input type="number" step="0.01" name="discount" value="' + discount + '" oninput="InvoicesPage.calcTotal()"></div>'
      + '<div class="form-group"><label class="form-label">Tax (₹)</label><input type="number" step="0.01" name="tax" value="' + tax + '" oninput="InvoicesPage.calcTotal()"></div>'
      + '</div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Amount Paid (₹)</label><input type="number" step="0.01" name="amount_paid" value="' + amountPaid + '" oninput="InvoicesPage.calcTotal()"></div>'
      + '<div class="form-group"><label class="form-label">Payment Method</label><select name="payment_method">'
      + '<option value="Cash"' + (paymentMethod === 'Cash' ? ' selected' : '') + '>Cash</option>'
      + '<option value="UPI"' + (paymentMethod === 'UPI' ? ' selected' : '') + '>UPI</option>'
      + '<option value="Card"' + (paymentMethod === 'Card' ? ' selected' : '') + '>Card</option>'
      + '<option value="Bank Transfer"' + (paymentMethod === 'Bank Transfer' ? ' selected' : '') + '>Bank Transfer</option>'
      + '<option value="Cheque"' + (paymentMethod === 'Cheque' ? ' selected' : '') + '>Cheque</option>'
      + '</select></div></div>'
      + '<div style="text-align:right;padding:0.5rem 0;font-size:1.1rem;font-weight:700">'
      + 'Total: <span id="inv-total">₹0.00</span> | Balance: <span id="inv-balance">₹0.00</span></div>'
      + '<div class="form-group"><label class="form-label">Notes</label><textarea name="notes">' + notes + '</textarea></div>'
      + '<button type="submit" class="btn btn-primary btn-block">' + (id ? 'Update' : 'Create') + ' Invoice</button></form>'
    );

    var container = document.getElementById('inv-items-container');
    if (container) {
      items.forEach(function(item, i) { InvoicesPage.renderItemRow(container, item, i); });
      this.calcTotal();
    }

    document.getElementById('invoice-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      var form = e.target;
      var data = {
        customer_name: form.customer_name.value,
        customer_phone: form.customer_phone.value,
        customer_email: form.customer_email.value,
        customer_address: form.customer_address.value,
        discount: parseFloat(form.discount.value) || 0,
        tax: parseFloat(form.tax.value) || 0,
        amount_paid: parseFloat(form.amount_paid.value) || 0,
        payment_method: form.payment_method.value,
        due_date: form.due_date.value,
        notes: form.notes.value,
        items: InvoicesPage.collectItems(),
      };
      if (!data.items.length) { showToast('Add at least one item', 'error'); return; }

      var iid = form.invoice_id.value;
      try {
        if (iid) { await API.put('/invoices/' + iid, data); showToast('Invoice updated'); }
        else { await API.post('/invoices', data); showToast('Invoice created'); }
        closeModal(); App.renderPage('invoices');
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

    div.innerHTML = '<select onchange="InvoicesPage.onProductSelect(this)">' + opts + '</select>'
      + '<input type="number" class="item-qty" value="' + item.qty + '" min="1" oninput="InvoicesPage.calcTotal()">'
      + '<input type="number" step="0.01" class="item-price" value="' + item.price + '" oninput="InvoicesPage.calcTotal()">'
      + '<span class="item-total" style="font-weight:600;text-align:right">₹0</span>'
      + '<button type="button" class="btn btn-icon btn-danger btn-sm" onclick="this.closest(\'.item-row\').remove();InvoicesPage.calcTotal()">×</button>';

    container.appendChild(div);
    var qtyInput = div.querySelector('.item-qty');
    var priceInput = div.querySelector('.item-price');
    if (qtyInput) qtyInput.value = item.qty;
    if (priceInput) priceInput.value = item.price;
    this.calcTotal();
  },

  onProductSelect(select) {
    var opt = select.options[select.selectedIndex];
    var row = select.closest('.item-row');
    if (opt.value) { row.querySelector('.item-price').value = opt.dataset.price; }
    this.calcTotal();
  },

  addItem() {
    var container = document.getElementById('inv-items-container');
    if (container) this.renderItemRow(container, { name: '', qty: 1, price: 0 }, container.children.length);
  },

  addFromProducts() {
    var prods = this._productsCache;
    var container = document.getElementById('inv-items-container');
    if (!container) return;

    // Refresh cache from API if empty
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
        + '<div style="font-size:0.75rem;color:#9ca3af">' + (p.sku ? p.sku + ' | ' : '') + formatCurrency(p.selling_price || p.price || 0) + '</div></div></label>';
    });
    listHtml += '</div>'
      + '<div class="flex gap-2 mt-2">'
      + '<button type="button" class="btn btn-primary btn-block" onclick="InvoicesPage.addSelectedProducts()">Add Selected</button>'
      + '<button type="button" class="btn btn-danger" onclick="closeModal()">Cancel</button>'
      + '</div>';
    showModal('Select Products (' + prods.length + ' items)', listHtml, true);
  },

  addSelectedProducts() {
    var checks = document.querySelectorAll('.prod-select:checked');
    var container = document.getElementById('inv-items-container');
    if (!container) return;
    checks.forEach(function(c) {
      var p = JSON.parse(c.value);
      InvoicesPage.renderItemRow(container, { product_id: p.product_id, name: p.name, qty: 1, price: p.price }, container.children.length);
    });
    closeModal();
  },

  collectItems() {
    var rows = document.querySelectorAll('#inv-items-container .item-row');
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
    var amountPaid = parseFloat(document.querySelector('[name="amount_paid"]')?.value) || 0;
    var total = subtotal - discount + tax;
    var balance = total - amountPaid;

    var totals = document.querySelectorAll('#inv-items-container .item-total');
    items.forEach(function(item, idx) {
      if (totals[idx]) totals[idx].textContent = formatCurrency(item.total);
    });

    var totalEl = document.getElementById('inv-total');
    var balanceEl = document.getElementById('inv-balance');
    if (totalEl) totalEl.textContent = formatCurrency(total);
    if (balanceEl) balanceEl.textContent = formatCurrency(balance);
  },

  async deleteInvoice(id) {
    if (!confirm('Delete this invoice?')) return;
    try { await API.delete('/invoices/' + id); showToast('Invoice deleted'); App.renderPage('invoices'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  async printInvoice(id) {
    try {
      var blob = await API.download('/invoices/' + id + '/pdf');
      downloadBlob(blob, 'Invoice-' + id + '.pdf');
    } catch (err) { showToast(err.message, 'error'); }
  },

  async exportExcel() {
    try { var blob = await API.download('/invoices/export'); downloadBlob(blob, 'invoices.xlsx'); showToast('Exported successfully'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  init() {},
};
