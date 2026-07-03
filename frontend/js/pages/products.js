var ProductsPage = {
  currentPage: 1,
  search: '',
  category: '',

  async render() {
    return '<div class="loading"><div class="spinner"></div></div>';
  },

  async renderProducts() {
    try {
      var params = new URLSearchParams({ page: this.currentPage, limit: 50 });
      if (this.search) params.set('search', this.search);
      if (this.category) params.set('category', this.category);

      var data = await API.get('/products?' + params.toString());
      var user = App.getUser();
      var isAdmin = user.role === 'admin';

      var html = '<div class="page-title">Products</div>';

      if (isAdmin) {
        html += '<div class="action-bar">'
          + '<button class="btn btn-primary btn-sm" onclick="ProductsPage.showForm()">+ Add Product</button>'
          + '<button class="btn btn-outline btn-sm" onclick="ProductsPage.showImport()">📥 Import</button>'
          + '<button class="btn btn-outline btn-sm" onclick="ProductsPage.exportExcel()">📤 Export</button>'
          + '<button class="btn btn-success btn-sm" onclick="ProductsPage.seedProducts()">🌱 Seed</button>'
          + '</div>';
      }

      html += '<div class="search-bar">'
        + '<input type="text" placeholder="Search products..." id="product-search"'
        + ' value="' + this.search + '" oninput="ProductsPage.searchProducts(this.value)">'
        + '<select onchange="ProductsPage.filterCategory(this.value)">'
        + '<option value="">All</option>';
      (data.categories || []).forEach(function(c) {
        html += '<option value="' + c + '"' + (ProductsPage.category === c ? ' selected' : '') + '>' + c + '</option>';
      });
      html += '</select></div>';

      html += '<div class="card"><div class="table-container"><table><thead><tr>'
        + '<th>Name</th><th>SKU</th><th>Price</th><th>Stock</th>'
        + (isAdmin ? '<th>Actions</th>' : '')
        + '</tr></thead><tbody>';

      if (data.products.length) {
        html += data.products.map(function(p) {
          var nameLabel = p.name || p.sku || ('#' + p._id);
          var row = '<tr><td><div style="font-weight:600">' + nameLabel + '</div><div style="font-size:0.75rem;color:#9ca3af">' + p.category + '</div></td>'
            + '<td style="color:#9ca3af;font-size:0.8rem">' + (p.sku || '-') + '</td>'
            + '<td style="font-weight:600">' + formatCurrency(p.selling_price || p.price) + '</td>'
            + '<td>' + p.stock + '</td>';
          if (isAdmin) {
            row += '<td><button class="btn btn-sm btn-outline" onclick="ProductsPage.showForm(\'' + p._id + '\')">✏️</button>'
              + '<button class="btn btn-sm btn-danger" onclick="ProductsPage.deleteProduct(\'' + p._id + '\')">🗑️</button></td>';
          }
          row += '</tr>';
          return row;
        }).join('');
      } else {
        html += '<tr><td colspan="5" class="text-center">No products found</td></tr>';
      }

      html += '</tbody></table></div></div>';

      if (data.pages > 1) {
        html += '<div class="flex justify-center gap-2" style="margin-top:1rem">'
          + '<button class="btn btn-sm btn-outline"' + (this.currentPage <= 1 ? ' disabled' : '') + ' onclick="ProductsPage.loadPage(' + (this.currentPage - 1) + ')">Prev</button>'
          + '<span style="color:#9ca3af;padding:0.5rem">' + this.currentPage + ' / ' + data.pages + '</span>'
          + '<button class="btn btn-sm btn-outline"' + (this.currentPage >= data.pages ? ' disabled' : '') + ' onclick="ProductsPage.loadPage(' + (this.currentPage + 1) + ')">Next</button>'
          + '</div>';
      }

      return html;
    } catch (err) {
      return '<div class="empty-state"><div class="icon">📦</div><h3>Failed to load products</h3></div>';
    }
  },

  loadPage(page) { this.currentPage = page; App.renderPage('products'); },

  searchProducts(value) {
    this.search = value;
    this.currentPage = 1;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(function() { App.renderPage('products'); }, 400);
  },

  filterCategory(value) { this.category = value; this.currentPage = 1; App.renderPage('products'); },

  showForm(id) {
    showModal('Product Form',
      '<form id="product-form">'
      + '<input type="hidden" name="product_id" value="' + (id || '') + '">'
      + '<div class="form-group"><label class="form-label">Product Name *</label><input type="text" name="name" required></div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">SKU</label><input type="text" name="sku"></div>'
      + '<div class="form-group"><label class="form-label">Category</label><input type="text" name="category" placeholder="General"></div>'
      + '</div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Price</label><input type="number" step="0.01" name="price"></div>'
      + '<div class="form-group"><label class="form-label">Cost Price</label><input type="number" step="0.01" name="cost_price"></div>'
      + '</div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">Selling Price</label><input type="number" step="0.01" name="selling_price"></div>'
      + '<div class="form-group"><label class="form-label">MRP</label><input type="number" step="0.01" name="mrp"></div>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">Stock</label><input type="number" name="stock" value="0"></div>'
      + '<div class="form-group"><label class="form-label">Description</label><textarea name="description"></textarea></div>'
      + '<button type="submit" class="btn btn-primary btn-block">' + (id ? 'Update' : 'Add') + ' Product</button></form>'
    );

    if (id) {
      API.get('/products/' + id).then(function(res) {
        var form = document.getElementById('product-form');
        if (!form) return;
        Object.keys(res.product).forEach(function(key) {
          var el = form.elements[key];
          if (el) el.value = res.product[key];
        });
      });
    }

    document.getElementById('product-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(e.target));
      var pid = data.product_id;
      delete data.product_id;
      try {
        if (pid) { await API.put('/products/' + pid, data); showToast('Product updated'); }
        else { await API.post('/products', data); showToast('Product added'); }
        closeModal(); App.renderPage('products');
      } catch (err) { showToast(err.message, 'error'); }
    });
  },

  async deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try { await API.delete('/products/' + id); showToast('Product deleted'); App.renderPage('products'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  showImport() {
    showModal('Import Products',
      '<p style="color:#9ca3af;margin-bottom:1rem">Upload Excel file with columns: Name, SKU, Category, Price, Cost Price, Selling Price, MRP, Stock</p>'
      + '<form id="import-form">'
      + '<div class="form-group"><input type="file" name="file" accept=".xlsx,.xls" required></div>'
      + '<button type="submit" class="btn btn-primary btn-block">Import</button></form>'
    );
    document.getElementById('import-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      try {
        var res = await API.upload('/products/import', fd);
        if (res.errors && res.errors.length) {
          showToast(res.message + ' | Errors: ' + res.errors.join(', '), 'error');
        } else {
          showToast(res.message);
        }
        closeModal();
        App.renderPage('products');
      } catch (err) { showToast(err.message, 'error'); }
    });
  },

  async exportExcel() {
    try { var blob = await API.download('/products/export'); downloadBlob(blob, 'products.xlsx'); showToast('Exported successfully'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  async seedProducts() {
    try { var res = await API.post('/products/seed'); showToast(res.message); App.renderPage('products'); }
    catch (err) { showToast(err.message, 'error'); }
  },

  init() {},
};
