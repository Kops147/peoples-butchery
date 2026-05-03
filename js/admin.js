/* =============================================
   The Peoples Butchery — Admin Portal (admin.js)
   Data sourced from Firestore
   ============================================= */

'use strict';

let _users = [];
let _orders = [];
let _products = [];
let _stats = {};
let _fb = null;

async function getFirebase() {
  if (_fb) return _fb;
  const { db } = await import('./firebase-config.js');
  const fb = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
  _fb = { db, ...fb };
  return _fb;
}

function toDate(val) {
  if (!val) return null;
  if (typeof val?.toDate === 'function') return val.toDate();
  return new Date(val);
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAdmin()) return;

  initSidebar();
  renderAdminUser();

  await loadAllAdminData();

  document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      showAdminTab(link.dataset.tab);
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout());
});

async function loadAllAdminData() {
  const failures = [];

  try {
    const { db, collection, getDocs, query, orderBy } = await getFirebase();

    try {
      const snap = await getDocs(collection(db, 'users'));
      _users = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => !u.isAdmin);
    } catch (e) { failures.push('users: ' + e.message); console.error('Users load failed:', e); }

    try {
      const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      _orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { failures.push('orders: ' + e.message); console.error('Orders load failed:', e); }

  } catch (e) {
    failures.push('firebase: ' + e.message);
    console.error('Firebase init failed:', e);
  }

  _products = DB.getProducts();
  if (_products.length === 0) { seedProducts(); _products = DB.getProducts(); }

  _stats = {
    totalUsers: _users.length,
    totalOrders: _orders.length,
    totalRevenue: _orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0),
    pendingOrders: _orders.filter(o => o.status === 'pending').length
  };

  if (failures.length) {
    showToast('⚠️ Some data failed to load: ' + failures.join(', '), 'error', 8000);
  }

  renderAdminOverview();
  renderAdminOrders();
  renderInventory();
  renderAdminProducts();
  renderReports();
  renderAdminCustomers();
  initCreditForm();
  initProductForm();
  initSettingsForm();
}

function showAdminTab(tab) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const panel = document.getElementById('tab-' + tab);
  if (panel) panel.classList.add('active');
}

// ── Admin User Display ─────────────────────────
function renderAdminUser() {
  const admin = Auth.getCurrentUser();
  document.getElementById('admin-name').textContent = admin?.name || 'Admin';
}

// ── Overview Stats ─────────────────────────────
function renderAdminOverview() {
  const today = new Date().toDateString();
  const todayOrders = _orders.filter(o => toDate(o.createdAt)?.toDateString() === today);

  setVal('stat-customers', _stats.totalUsers ?? _users.length);
  setVal('stat-orders', _stats.totalOrders ?? _orders.length);
  setVal('stat-revenue', formatCurrency(_stats.totalRevenue ?? 0));
  setVal('stat-pending', _stats.pendingOrders ?? _orders.filter(o => o.status === 'pending').length);
  setVal('stat-today', todayOrders.length);

  const recentEl = document.getElementById('admin-recent-orders');
  if (!recentEl) return;

  const recent = [..._orders].slice(0, 8);

  if (recent.length === 0) {
    recentEl.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">No orders yet</td></tr>`;
    return;
  }

  recentEl.innerHTML = recent.map(o => {
    const user = _users.find(u => u.id === o.userId);
    const displayName = user ? `${user.name} ${user.surname}` : (o.userEmail || '—');
    return `<tr>
      <td><span class="font-bold">#${o.id.slice(-8)}</span></td>
      <td>${displayName}</td>
      <td class="text-gold font-bold">${formatCurrency(o.total)}</td>
      <td>${statusBadge(o.status)}</td>
      <td>
        <select class="form-control" style="padding:6px 10px;font-size:0.8rem" onchange="updateOrderStatus('${o.id}', this.value)">
          ${['pending', 'processing', 'delivering', 'delivered', 'collected', 'cancelled'].map(s =>
      `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
    ).join('')}
        </select>
      </td>
    </tr>`;
  }).join('');
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Credit User ───────────────────────────────
function initCreditForm() {
  const refInput = document.getElementById('credit-ref');
  const lookupBtn = document.getElementById('lookup-user-btn');
  const creditForm = document.getElementById('credit-form');

  if (lookupBtn) {
    lookupBtn.addEventListener('click', () => {
      const ref = refInput.value.trim().toUpperCase();
      if (!ref) { showToast('Enter a REF number', 'warning'); return; }

      const user = _users.find(u => (u.refNumber || '').toUpperCase() === ref);
      const infoEl = document.getElementById('credit-user-info');

      if (!user) {
        infoEl.innerHTML = `<div class="alert alert-error">❌ No customer found with REF: <strong>${ref}</strong></div>`;
        return;
      }

      infoEl.innerHTML = `<div class="card-glass p-4" style="display:flex;gap:16px;align-items:center;">
        <div class="user-avatar" style="width:52px;height:52px;font-size:1.2rem">${(user.name || '?')[0]}</div>
        <div>
          <div style="font-weight:700;font-size:1rem">${user.name} ${user.surname || ''}</div>
          <div style="color:var(--text-secondary);font-size:0.85rem">${user.email} · ${user.phone || ''}</div>
          <div style="margin-top:6px">Current Balance: <span class="text-gold font-bold">${formatCurrency(user.creditBalance || 0)}</span></div>
        </div>
      </div>`;
      document.getElementById('credit-user-id').value = user.id;
    });
  }

  if (creditForm) {
    creditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userId = document.getElementById('credit-user-id').value;
      const amount = parseFloat(document.getElementById('credit-amount').value);
      const note = document.getElementById('credit-note').value.trim();

      if (!userId) { showToast('Look up a customer first', 'warning'); return; }
      if (!amount || amount <= 0) { showToast('Enter a valid amount', 'warning'); return; }

      try {
        const { db, doc, updateDoc } = await getFirebase();
        const user = _users.find(u => u.id === userId);
        const newBalance = (parseFloat(user?.creditBalance || 0) + amount);

        await updateDoc(doc(db, 'users', userId), { creditBalance: newBalance });

        const localUser = DB.findUserById(userId);
        if (localUser) { localUser.creditBalance = newBalance; DB.updateUser(localUser); }

        const userName = user ? `${user.name} ${user.surname}` : 'Customer';
        if (user) user.creditBalance = newBalance;

        showToast(`✅ R${amount.toFixed(2)} credited to ${userName}!`, 'success', 5000);
        document.getElementById('credit-user-info').innerHTML = `
          <div class="alert alert-success">✅ New balance for <strong>${userName}</strong>: <strong>${formatCurrency(newBalance)}</strong></div>`;
        creditForm.reset();
        document.getElementById('credit-user-id').value = '';
        renderAdminCustomers();
      } catch (err) {
        showToast('Failed to add credit: ' + err.message, 'error');
      }
    });
  }

  refInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); lookupBtn?.click(); } });
}

// ── Orders Management ──────────────────────────
function renderAdminOrders() {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  if (_orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No orders yet</td></tr>`;
    return;
  }

  tbody.innerHTML = _orders.map(o => {
    const user = _users.find(u => u.id === o.userId);
    const displayName = user ? `${user.name} ${user.surname}` : '—';
    const email = o.userEmail || user?.email || '';
    const icon = o.deliveryMethod === 'delivery' ? '🚗' : '🏪';
    const itemCount = Array.isArray(o.items) ? o.items.length : 0;
    return `<tr>
      <td class="font-bold" style="font-size:0.82rem">#${o.id.slice(-10)}</td>
      <td>
        <div style="font-weight:600">${displayName}</div>
        <div style="font-size:0.78rem;color:var(--text-muted)">${email}</div>
      </td>
      <td>${itemCount} item(s)</td>
      <td class="text-gold font-bold">${formatCurrency(o.total)}</td>
      <td>${icon} ${o.deliveryMethod === 'delivery' ? 'Deliver' : 'Collect'}</td>
      <td>${statusBadge(o.status)}</td>
      <td>
        <select class="form-control" style="padding:6px 10px;font-size:0.8rem;min-width:130px" onchange="updateOrderStatus('${o.id}', this.value)">
          ${['pending', 'processing', 'delivering', 'delivered', 'collected', 'cancelled'].map(s =>
      `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
    ).join('')}
        </select>
      </td>
    </tr>`;
  }).join('');

  const filterEl = document.getElementById('order-status-filter');
  if (filterEl) {
    filterEl.addEventListener('change', () => filterOrders(filterEl.value));
  }
}

function filterOrders(status) {
  document.querySelectorAll('#admin-orders-tbody tr').forEach(row => {
    if (!status) { row.style.display = ''; return; }
    const badge = row.querySelector('.badge');
    const rowStatus = badge?.textContent.toLowerCase() || '';
    row.style.display = rowStatus.includes(status.toLowerCase()) ? '' : 'none';
  });
}

window.updateOrderStatus = async (orderId, newStatus) => {
  try {
    const { db, doc, updateDoc } = await getFirebase();
    await updateDoc(doc(db, 'orders', orderId), { status: newStatus, updatedAt: new Date().toISOString() });
    const order = _orders.find(o => o.id === orderId);
    if (order) order.status = newStatus;
    showToast(`Order updated to: ${newStatus}`, 'success');
    renderAdminOrders();
    renderAdminOverview();
  } catch (err) {
    showToast('Failed to update order: ' + err.message, 'error');
  }
};

// ── Inventory Tab ────────────────────────────
function renderInventory() {
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;

  tbody.innerHTML = _products.map(p => {
    const stock = parseFloat(p.available_qty ?? p.stockKg ?? 0);
    const minStock = parseFloat(p.min_stock ?? p.minStock ?? 5);
    const isLow = stock <= minStock;
    const badge = isLow
      ? '<span class="badge badge-red">⚠️ Low Stock</span>'
      : '<span class="badge badge-green">✅ Sufficient</span>';
    return `<tr>
      <td><strong>${p.name}</strong></td>
      <td style="color:var(--text-muted)">${p.unit || 'units'}</td>
      <td style="font-weight:700">${stock.toFixed(1)}</td>
      <td>${minStock}</td>
      <td>${badge}</td>
      <td>
        <div style="display:flex;gap:4px">
          <input type="number" id="add-stock-${p.id}" class="form-control" style="width:70px;padding:4px 8px" placeholder="0">
          <button class="btn btn-primary btn-sm" onclick="handleUpdateStock('${p.id}')">+</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

window.handleUpdateStock = (id) => {
  const input = document.getElementById(`add-stock-${id}`);
  const amount = parseFloat(input.value);
  if (isNaN(amount) || amount <= 0) return;

  const p = _products.find(pr => pr.id == id);
  if (!p) return;

  const current = parseFloat(p.available_qty ?? p.stockKg ?? 0);
  p.available_qty = current + amount;
  p.stockKg = current + amount;
  DB.updateProduct(p);
  input.value = '';
  showToast(`Added ${amount} units to ${p.name}`, 'success');
  renderInventory();
  renderReports();
};

// ── Reports Tab ──────────────────────────────
let revenueChart, inventoryChart;

function renderReports() {
  const revenue = parseFloat(_stats.totalRevenue || 0);
  document.getElementById('rep-projected-income').textContent = formatCurrency(revenue * 1.15);

  const revCtx = document.getElementById('chart-revenue')?.getContext('2d');
  if (revCtx) {
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(revCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Revenue (R)',
          data: [1200, 1900, 1500, 2500, 2200, 3100, 2800],
          borderColor: '#e8a020',
          backgroundColor: 'rgba(232, 160, 32, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false } } }
    });
  }

  const invCtx = document.getElementById('chart-inventory')?.getContext('2d');
  if (invCtx) {
    const top6 = _products.slice(0, 6);
    if (inventoryChart) inventoryChart.destroy();
    inventoryChart = new Chart(invCtx, {
      type: 'bar',
      data: {
        labels: top6.map(p => p.name),
        datasets: [{
          label: 'Stock (qty)',
          data: top6.map(p => parseFloat(p.available_qty ?? p.stockKg ?? 0)),
          backgroundColor: top6.map(p =>
            parseFloat(p.available_qty ?? p.stockKg ?? 0) < parseFloat(p.min_stock ?? p.minStock ?? 5) ? '#e74c3c' : '#e8a020'
          )
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
    });
  }
}

// ── Products Management ────────────────────────
function renderAdminProducts() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;

  container.innerHTML = _products.map(p => {
    const isActive = (p.is_active ?? p.available) !== false;
    return `
    <div class="product-admin-card mb-4" id="prod-admin-${p.id}">
      <div class="product-admin-img">
        <img src="${p.image_url || p.image || ''}" alt="${p.name}"
          onerror="this.src='https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop'">
      </div>
      <div class="product-admin-info">
        <div style="font-family:var(--font-head);font-weight:700">${p.name}</div>
        <div style="font-size:0.8rem;color:var(--text-secondary);margin:4px 0">${p.description || ''}</div>
        <div style="display:flex;gap:12px;align-items:center;margin-top:8px;flex-wrap:wrap">
          <span class="text-gold font-bold">
            ${p.is_special
        ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:0.8rem">R${p.price}</span> ${formatCurrency(p.discount_price)}`
        : formatCurrency(p.price)}
            <span style="font-weight:400;color:var(--text-muted);font-size:0.8rem">${p.unit || ''}</span>
          </span>
          <span class="badge ${p.category === 'raw' ? 'badge-red' : 'badge-gold'}">${p.category === 'raw' ? '🥩 Raw' : '🍽️ Cooked'}</span>
          <span class="badge ${isActive ? 'badge-green' : 'badge-gray'}">${isActive ? '✅ Available' : '❌ Unavailable'}</span>
          ${p.is_special ? '<span class="badge badge-gold">🔥 Special</span>' : ''}
        </div>
      </div>
      <div class="product-admin-actions">
        <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')">✏️ Edit</button>
        <button class="btn ${isActive ? 'btn-outline' : 'btn-success'} btn-sm" onclick="toggleAvailability('${p.id}')">
          ${isActive ? '⛔ Disable' : '✅ Enable'}
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">🗑️ Delete</button>
      </div>
    </div>`;
  }).join('');
}

window.toggleAvailability = (productId) => {
  const p = _products.find(pr => pr.id == productId);
  if (!p) return;
  const newState = !((p.is_active ?? p.available) !== false);
  p.is_active = newState;
  p.available = newState;
  DB.updateProduct(p);
  renderAdminProducts();
  showToast(`${p.name} ${newState ? 'enabled' : 'disabled'}`, 'info');
};

window.deleteProduct = (productId) => {
  if (!confirm('Delete this product?')) return;
  const p = _products.find(pr => pr.id == productId);
  if (p) { p.is_active = false; p.available = false; DB.updateProduct(p); }
  _products = _products.filter(pr => pr.id != productId);
  renderAdminProducts();
  showToast('Product removed', 'warning');
};

window.editProduct = (productId) => {
  const p = _products.find(pr => pr.id == productId);
  if (!p) return;
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-category').value = p.category;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-unit').value = p.unit || '';
  document.getElementById('prod-desc').value = p.description || '';
  document.getElementById('prod-image').value = p.image_url || p.image || '';
  document.getElementById('prod-is-special').checked = p.is_special || false;
  document.getElementById('prod-discount').value = p.discount_price || '';
  document.getElementById('product-modal').classList.add('open');
  document.getElementById('product-modal-title').textContent = 'Edit Product';
};

function initProductForm() {
  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    document.getElementById('product-form')?.reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('product-modal-title').textContent = 'Add New Product';
    document.getElementById('product-modal').classList.add('open');
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    });
  });

  document.getElementById('product-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const imgVal = document.getElementById('prod-image').value.trim()
      || 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop';
    const payload = {
      name: document.getElementById('prod-name').value.trim(),
      category: document.getElementById('prod-category').value,
      price: parseFloat(document.getElementById('prod-price').value),
      unit: document.getElementById('prod-unit').value.trim(),
      description: document.getElementById('prod-desc').value.trim(),
      image: imgVal,
      image_url: imgVal,
      is_active: true,
      available: true,
    };

    if (id) {
      const idx = _products.findIndex(p => p.id == id);
      if (idx !== -1) { _products[idx] = { ..._products[idx], ...payload }; DB.updateProduct(_products[idx]); }
      showToast('Product updated!', 'success');
    } else {
      const newProd = { ...payload, id: generateId('p_'), stockKg: 0, minStock: 5 };
      _products.push(newProd);
      const prods = DB.getProducts();
      prods.push(newProd);
      DB.saveProducts(prods);
      showToast('Product added!', 'success');
    }
    document.getElementById('product-modal').classList.remove('open');
    renderAdminProducts();
    renderInventory();
  });
}

// ── Customers Tab ──────────────────────────────
function renderAdminCustomers() {
  const tbody = document.getElementById('customers-tbody');
  if (!tbody) return;

  if (_users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">No customers registered yet</td></tr>`;
    return;
  }

  tbody.innerHTML = [..._users]
    .sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0))
    .map(u => {
      const orderCount = _orders.filter(o => o.userId === u.id).length;
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="user-avatar" style="width:32px;height:32px;font-size:0.85rem">${(u.name || '?')[0]}</div>
            <div>
              <div style="font-weight:600">${u.name} ${u.surname || ''}</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">${u.email}</div>
            </div>
          </div>
        </td>
        <td><span class="ref-number" style="font-size:1rem;letter-spacing:2px">${u.refNumber || ''}</span></td>
        <td>${u.phone || ''}</td>
        <td class="text-gold font-bold">${formatCurrency(u.creditBalance || 0)}</td>
        <td>${orderCount}</td>
        <td style="font-size:0.8rem;color:var(--text-muted)">${formatDateShort(toDate(u.createdAt))}</td>
      </tr>`;
    }).join('');

  const searchEl = document.getElementById('customer-search');
  if (searchEl && !searchEl._searchBound) {
    searchEl._searchBound = true;
    searchEl.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      tbody.querySelectorAll('tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }
}

// ── System Settings ───────────────────────────
function initSettingsForm() {
  const settings = DB.getSettings();
  document.getElementById('setting-opt-a-setup').value = settings.optA.setup;
  document.getElementById('setting-opt-a-monthly').value = settings.optA.monthly;
  document.getElementById('setting-opt-b-setup').value = settings.optB.setup;
  document.getElementById('setting-opt-b-monthly').value = settings.optB.monthly;
  document.getElementById('setting-opt-b-comm').value = settings.optB.commission;

  document.getElementById('save-settings-btn')?.addEventListener('click', () => {
    const s = {
      optA: {
        setup: parseFloat(document.getElementById('setting-opt-a-setup').value),
        monthly: parseFloat(document.getElementById('setting-opt-a-monthly').value)
      },
      optB: {
        setup: parseFloat(document.getElementById('setting-opt-b-setup').value),
        monthly: parseFloat(document.getElementById('setting-opt-b-monthly').value),
        commission: parseFloat(document.getElementById('setting-opt-b-comm').value)
      }
    };
    DB.saveSettings(s);
    showToast('Pricing configurations saved!', 'success');
  });
}
