/* =============================================
   The Peoples Butchery — Admin Portal (admin.js)
   Data sourced from Supabase
   ============================================= */

'use strict';

import { supabase } from './supabase-config.js';
import { LOCAL_CATALOG, mapToProduct } from './catalog.js';

let _users = [];
let _orders = [];
let _products = [];
let _stats = {};

// ── Category lookup from local catalog ─────────
function buildCategoryMap() {
  const map = {};
  LOCAL_CATALOG.map(mapToProduct).forEach(p => {
    map[p.id] = { category: p.category, categoryLabel: p.categoryLabel };
  });
  return map;
}
const CATEGORY_MAP = buildCategoryMap();

// ── Data Mappers ──────────────────────────────
function mapUser(u) {
  return { ...u, isAdmin: u.is_admin, creditBalance: u.credit_balance, refNumber: u.ref_number, createdAt: u.created_at };
}
function mapOrder(o) {
  return { ...o, userId: o.user_id, userEmail: o.user_email, deliveryMethod: o.delivery_method, deliveryAddress: o.delivery_address, deliveryFee: o.delivery_fee, createdAt: o.created_at };
}
function mapProduct(p) {
  const cat = CATEGORY_MAP[p.id] || {};
  return { ...p, category: cat.category || 'raw', categoryLabel: cat.categoryLabel || 'Other', stockQty: p.stock_qty || 0, image_url: p.image, createdAt: p.created_at };
}

// ── Local File Upload ─────────────────────────
function openPhotoPicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      document.getElementById('prod-image').value = url;
      setImagePreview(url);
      document.getElementById('upload-status').textContent = `✅ Selected: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function toDate(val) {
  if (!val) return null;
  if (typeof val?.toDate === 'function') return val.toDate();
  return new Date(val);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!Auth.requireAdmin()) return;
    setupAdminSidebar();
    renderAdminUser();
    await loadAllAdminData();

    // Handle standalone pages by detecting current tab from URL or body class
    const path = window.location.pathname;
    let activeTab = 'overview';
    if (path.includes('admin-products')) activeTab = 'products';
    else if (path.includes('admin-customers')) activeTab = 'customers';
    else if (path.includes('admin-inventory')) activeTab = 'inventory';
    else if (path.includes('admin-reports')) activeTab = 'reports';
    else if (path.includes('admin-orders')) activeTab = 'orders';
    else if (path.includes('admin-credit')) activeTab = 'credit';
    else if (path.includes('admin-settings')) activeTab = 'settings';

    // Set active link in sidebar
    document.querySelectorAll('.sidebar-link').forEach(l => {
      l.classList.remove('active');
      if (l.getAttribute('href')?.includes(activeTab)) l.classList.add('active');
      else if (activeTab === 'overview' && (l.getAttribute('href') === 'admin.html' || l.dataset.tab === 'overview')) l.classList.add('active');
    });

    renderAdminTab(activeTab);
    document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout());
  } catch (error) {
    console.error('Error initializing admin panel:', error);
    showToast('Error initializing admin panel. Please refresh the page.', 'error', 8000);
  }
});

function setupAdminSidebar() {
  try {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!toggle || !sidebar) {
      console.warn('Sidebar elements not found in DOM');
      return;
    }

    function openSidebar() { sidebar.classList.add('mobile-open'); if (overlay) overlay.classList.add('open'); }
    function closeSidebar() { sidebar.classList.remove('mobile-open'); if (overlay) overlay.classList.remove('open'); }
    toggle.addEventListener('click', openSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Sidebar navigation is now handled by regular <a> href links
    // to standalone pages for better reliability.
  } catch (error) {
    console.error('Error setting up admin sidebar:', error);
  }
}

function renderAdminTab(tab) {
  try {
    switch (tab) {
      case 'overview': renderAdminOverview(); break;
      case 'credit': renderAdminCredits(); break;
      case 'orders': renderAdminOrders(); break;
      case 'inventory': renderInventory(); break;
      case 'products': renderAdminProducts(); break;
      case 'reports': renderReports(); break;
      case 'customers': renderAdminCustomers(); break;
      case 'settings': break;
    }
  } catch (error) {
    console.error(`Error rendering tab "${tab}":`, error);
    showToast(`Error rendering content: ${error.message}`, 'error');
  }
}

async function loadAllAdminData() {
  const failures = [];

  try {
    const { data: userData, error: userError } = await supabase.from('users').select('*').eq('is_admin', false);
    if (userError) throw userError;
    _users = (userData && userData.length > 0) ? userData.map(mapUser) : DB.getUsers().map(mapUser);

    const { data: orderData, error: orderError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (orderError) throw orderError;
    _orders = (orderData && orderData.length > 0) ? orderData.map(mapOrder) : DB.getOrders().map(mapOrder);

    const { data: prodData, error: prodError } = await supabase.from('products').select('*');
    if (prodError) throw prodError;
    if (prodData && prodData.length > 0) {
      _products = prodData.map(mapProduct);
    } else {
      const localProds = DB.getProducts();
      _products = (localProds && localProds.length > 0) ? localProds.map(mapProduct) : LOCAL_CATALOG.map(mapToProduct);
    }
  } catch (e) {
    failures.push('Database sync failed: ' + e.message);
    console.error('Data load failed:', e);
    
    // Total fallback to localStorage
    _users = DB.getUsers().map(mapUser);
    _orders = DB.getOrders().map(mapOrder);
    _products = DB.getProducts().length > 0 ? DB.getProducts().map(mapProduct) : LOCAL_CATALOG.map(mapToProduct);
  }

  _stats = {
    totalUsers: _users.length,
    totalOrders: _orders.length,
    totalRevenue: _orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0),
    pendingOrders: _orders.filter(o => o.status === 'pending').length
  };

  // Re-render everything with the best available data
  renderAdminOverview();
  renderAdminOrders();
  renderInventory();
  renderAdminProducts();
  renderReports();
  renderAdminCustomers();
  
  if (failures.length && !(_users.length || _orders.length)) {
    showToast('⚠️ Using local cache. Connect database for live updates.', 'warning', 5000);
  }
}

function renderAdminUser() {
  const admin = Auth.getCurrentUser();
  document.getElementById('admin-name').textContent = admin?.name || 'Admin';
}

function renderAdminOverview() {
  const today = new Date().toDateString();
  const todayOrders = _orders.filter(o => toDate(o.createdAt)?.toDateString() === today);

  setVal('stat-customers', _users.length);
  setVal('stat-orders', _orders.length);
  setVal('stat-revenue', formatCurrency(_stats.totalRevenue ?? 0));
  setVal('stat-pending', _orders.filter(o => o.status === 'pending').length);
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

      if (!userId) { showToast('Look up a customer first', 'warning'); return; }
      if (!amount || amount <= 0) { showToast('Enter a valid amount', 'warning'); return; }

      try {
        const user = _users.find(u => u.id === userId);
        const newBalance = (parseFloat(user?.creditBalance || 0) + amount);

        const { error } = await supabase.from('users').update({ credit_balance: newBalance }).eq('id', userId);
        if (error) throw error;

        // Log to transactions table (non-critical — don't block if table doesn't exist yet)
        supabase.from('transactions').insert({
          user_id: userId,
          user_email: user?.email || '',
          amount,
          type: 'credit',
          notes: 'Credit added by admin',
          status: 'completed'
        }).then(({ error: txErr }) => { if (txErr) console.warn('Transaction log failed:', txErr.message); });

        const localUser = DB.findUserById(userId);
        if (localUser) { localUser.creditBalance = newBalance; DB.updateUser(localUser); }
        if (user) user.creditBalance = newBalance;

        const userName = user ? `${user.name} ${user.surname}` : 'Customer';
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

// ── Render Credit Tab ──────────────────────────
function renderAdminCredits() {
  initCreditForm();
}

// ── Orders ────────────────────────────────────
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
  if (filterEl) filterEl.addEventListener('change', () => filterOrders(filterEl.value));
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
    const { error } = await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
    if (error) throw error;
    const order = _orders.find(o => o.id === orderId);
    if (order) order.status = newStatus;
    showToast(`Order updated to: ${newStatus}`, 'success');
    renderAdminOrders();
    renderAdminOverview();
  } catch (err) {
    showToast('Failed to update order: ' + err.message, 'error');
  }
};

// ── Inventory ─────────────────────────────────
function renderInventory() {
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;

  tbody.innerHTML = _products.map(p => {
    const stock = parseFloat(p.stockQty ?? p.stock_qty ?? 0);
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

window.handleUpdateStock = async (id) => {
  const input = document.getElementById(`add-stock-${id}`);
  const amount = parseFloat(input.value);
  if (isNaN(amount) || amount <= 0) return;

  const p = _products.find(pr => pr.id == id);
  if (!p) return;

  const current = parseFloat(p.stockQty ?? p.stock_qty ?? 0);
  const newQty = current + amount;
  p.stockQty = newQty;

  input.value = '';
  showToast(`Added ${amount} units to ${p.name}`, 'success');
  renderInventory();
  renderReports();
};

// ── Reports ───────────────────────────────────
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
        datasets: [{ label: 'Revenue (R)', data: [1200, 1900, 1500, 2500, 2200, 3100, 2800], borderColor: '#e8a020', backgroundColor: 'rgba(232, 160, 32, 0.1)', fill: true, tension: 0.4 }]
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
        datasets: [{ label: 'Stock (qty)', data: top6.map(p => parseFloat(p.stockQty ?? 0)), backgroundColor: top6.map(p => parseFloat(p.stockQty ?? 0) < 5 ? '#e74c3c' : '#e8a020') }]
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
    });
  }
}

// ── Products ──────────────────────────────────
function renderAdminProducts() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;

  container.innerHTML = _products.map(p => {
    const isActive = p.is_active !== false;
    return `
    <div class="product-admin-card mb-4" id="prod-admin-${p.id}">
      <div class="product-admin-img">
        <img src="${p.image_url || p.image || ''}" alt="${p.name}" onerror="this.src='assets/img/food/meat_on_braai.jpg'">
      </div>
      <div class="product-admin-info">
        <div style="font-family:var(--font-head);font-weight:700">${p.name}</div>
        <div style="font-size:0.8rem;color:var(--text-secondary);margin:4px 0">${p.description || ''}</div>
        <div style="display:flex;gap:12px;align-items:center;margin-top:8px;flex-wrap:wrap">
          <span class="text-gold font-bold">${formatCurrency(p.price)} <span style="font-weight:400;color:var(--text-muted);font-size:0.8rem">${p.unit || ''}</span></span>
          <span class="badge ${p.category === 'raw' ? 'badge-red' : 'badge-gold'}">${p.category === 'raw' ? '🥩 Raw' : '🍽️ Cooked'}</span>
          <span class="badge ${isActive ? 'badge-green' : 'badge-gray'}">${isActive ? '✅ Available' : '❌ Unavailable'}</span>
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

window.toggleAvailability = async (productId) => {
  const p = _products.find(pr => pr.id == productId);
  if (!p) return;
  const newState = !(p.is_active !== false);
  p.is_active = newState;
  p.available = newState;
  renderAdminProducts();
  showToast(`${p.name} ${newState ? 'enabled' : 'disabled'}`, 'info');
};

window.deleteProduct = async (productId) => {
  if (!confirm('Delete this product?')) return;
  _products = _products.filter(pr => pr.id != productId);
  renderAdminProducts();
  showToast('Product removed', 'warning');
};

function setImagePreview(url) {
  const preview = document.getElementById('prod-image-preview');
  if (!preview) return;
  if (url) { preview.src = url; preview.style.display = 'block'; }
  else { preview.src = ''; preview.style.display = 'none'; }
}

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
  document.getElementById('upload-status').textContent = p.image_url ? 'Image set' : 'Upload a photo from your computer';
  setImagePreview(p.image_url || p.image || '');
  document.getElementById('product-modal').classList.add('open');
  document.getElementById('product-modal-title').textContent = 'Edit Product';
};

function initProductForm() {
  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    document.getElementById('product-form')?.reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-image').value = '';
    document.getElementById('upload-status').textContent = 'Upload a photo from your computer';
    setImagePreview('');
    document.getElementById('product-modal-title').textContent = 'Add New Product';
    document.getElementById('product-modal').classList.add('open');
  });

  document.getElementById('upload-image-btn')?.addEventListener('click', () => openPhotoPicker());

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    });
  });

  document.getElementById('product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const id = document.getElementById('prod-id').value;
    const imgVal = document.getElementById('prod-image').value.trim() || 'assets/img/food/beef_brisket.png';
    const payload = {
      name: document.getElementById('prod-name').value.trim(),
      unit: document.getElementById('prod-unit').value.trim(),
      is_active: true,
    };

    try {
      if (id) {
        const idx = _products.findIndex(p => p.id == id);
        if (idx !== -1) _products[idx] = { ..._products[idx], name: payload.name, unit: payload.unit, image_url: imgVal, price: parseFloat(document.getElementById('prod-price').value), description: document.getElementById('prod-desc').value.trim() };
        showToast('Product updated!', 'success');
      } else {
        const newId = generateId('p_');
        const newProd = { id: newId, name: payload.name, unit: payload.unit, is_active: true, image_url: imgVal, price: parseFloat(document.getElementById('prod-price').value), description: document.getElementById('prod-desc').value.trim(), category: document.getElementById('prod-category').value, stockQty: 0 };
        _products.push(newProd);
        showToast('Product added!', 'success');
      }
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Product';
    document.getElementById('product-modal').classList.remove('open');
    renderAdminProducts();
    renderInventory();
  });
}

// ── Customers ─────────────────────────────────
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

// ── Settings ──────────────────────────────────
function initSettingsForm() {
  const settings = DB.getSettings();
  document.getElementById('setting-opt-a-setup').value = settings.optA.setup;
  document.getElementById('setting-opt-a-monthly').value = settings.optA.monthly;
  document.getElementById('setting-opt-b-setup').value = settings.optB.setup;
  document.getElementById('setting-opt-b-monthly').value = settings.optB.monthly;
  document.getElementById('setting-opt-b-comm').value = settings.optB.commission;

  document.getElementById('save-settings-btn')?.addEventListener('click', () => {
    const s = {
      optA: { setup: parseFloat(document.getElementById('setting-opt-a-setup').value), monthly: parseFloat(document.getElementById('setting-opt-a-monthly').value) },
      optB: { setup: parseFloat(document.getElementById('setting-opt-b-setup').value), monthly: parseFloat(document.getElementById('setting-opt-b-monthly').value), commission: parseFloat(document.getElementById('setting-opt-b-comm').value) }
    };
    DB.saveSettings(s);
    showToast('Settings saved!', 'success');
  });
}
