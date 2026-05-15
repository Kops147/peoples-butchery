/* =============================================
   The Peoples Butchery — Customer Dashboard (dashboard.js)
   Data sourced from live backend API
   ============================================= */

'use strict';

let currentUser = null;
let userOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLogin()) return;

  const sess = Auth.getSession();
  if (!sess) { Auth.logout(); return; }
  if (sess.isAdmin) { window.location.href = 'admin.html'; return; }

  initSidebar();

  await API.get('/users/me')
    .then(u => { currentUser = u; })
    .catch(err => { console.error('User load failed:', err); showToast('Could not load your profile', 'error'); });

  await API.get('/orders')
    .then(o => { userOrders = Array.isArray(o) ? o : []; })
    .catch(err => { console.error('Orders load failed:', err); });

  if (!currentUser) {
    showToast('Session expired. Please log in again.', 'error');
    setTimeout(() => Auth.logout(), 2000);
    return;
  }

  renderSidebarUser();
  renderOverview();
  renderOrders();
  renderTransactions();
  renderProfile();

  document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.addEventListener('click', () => {
      const tab = link.dataset.tab;
      showTab(tab);
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout());

  const hash = window.location.hash.replace('#', '');
  if (hash) showTab(hash);
});

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const panel = document.getElementById('tab-' + tab);
  if (panel) panel.classList.add('active');
  const link = document.querySelector(`.sidebar-link[data-tab="${tab}"]`);
  if (link) link.classList.add('active');
}

// ── Sidebar User Info ─────────────────────────
function renderSidebarUser() {
  document.getElementById('sb-name').textContent = `${currentUser.name} ${currentUser.surname}`;
  document.getElementById('sb-ref').textContent = currentUser.refNumber || currentUser.ref_number || '';
  document.getElementById('sb-balance').textContent = formatCurrency(currentUser.creditBalance ?? currentUser.credit_balance);
  document.getElementById('sb-avatar').textContent = (currentUser.name || '?')[0].toUpperCase();
}

// ── Overview Tab ──────────────────────────────
function renderOverview() {
  document.getElementById('ov-balance').textContent = formatCurrency(currentUser.creditBalance ?? currentUser.credit_balance);
  document.getElementById('ov-ref').textContent = currentUser.refNumber || currentUser.ref_number || '';

  document.getElementById('ov-total-orders').textContent = userOrders.length;
  const pending = userOrders.filter(o => ['pending', 'processing', 'delivering', 'braai', 'packaging'].includes(o.status));
  document.getElementById('ov-active-orders').textContent = pending.length;

  const recentEl = document.getElementById('ov-recent-orders');
  const recent = [...userOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
  if (recent.length === 0) {
    recentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No orders yet</div><div class="empty-desc">Head to the shop to place your first order!</div><a href="shop.html" class="btn btn-primary mt-4">Browse Shop</a></div>`;
  } else {
    recentEl.innerHTML = recent.map(o => renderOrderCard(o)).join('');
  }
}

// ── Orders Tab ────────────────────────────────
function renderOrders() {
  const el = document.getElementById('tab-orders');
  if (!el) return;
  const container = el.querySelector('.orders-list');
  if (!container) return;

  const sorted = [...userOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sorted.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">No orders yet</div><div class="empty-desc">Place your first order and it will appear here.</div><a href="shop.html" class="btn btn-primary mt-4">Go to Shop</a></div>`;
    return;
  }
  container.innerHTML = sorted.map(o => renderOrderCard(o, true)).join('');
}

function renderOrderCard(order, detailed = false) {
  const status = order.status || 'pending';
  const statusMap = {
    pending: { icon: '⏳', label: 'Pending', badgeClass: 'status-pending' },
    braai: { icon: '🔥', label: 'On the Braai', badgeClass: 'status-processing' },
    packaging: { icon: '🥡', label: 'Packaging', badgeClass: 'status-processing' },
    processing: { icon: '🔥', label: 'Processing', badgeClass: 'status-processing' },
    dispatched: { icon: '🚚', label: 'Dispatched', badgeClass: 'status-delivering' },
    delivering: { icon: '🚚', label: 'On the Way', badgeClass: 'status-delivering' },
    ready: { icon: '✅', label: 'Ready for Collection', badgeClass: 'status-delivered' },
    delivered: { icon: '✅', label: 'Delivered', badgeClass: 'status-delivered' },
    collected: { icon: '🏪', label: 'Collected', badgeClass: 'status-collected' },
    cancelled: { icon: '❌', label: 'Cancelled', badgeClass: 'status-cancelled' },
  };
  const { icon, label, badgeClass } = statusMap[status] || { icon: '❓', label: status, badgeClass: 'badge-gray' };

  const itemCount = order.total_items || order.item_count || '?';
  const itemsText = `${itemCount} item(s)`;

  const statuses = ['pending', 'braai', 'packaging', 'dispatched', 'delivered'];
  const currentIdx = statuses.indexOf(status);
  const progressPercent = Math.max(0, ((currentIdx + 1) / statuses.length) * 100);

  let trackingHtml = '';
  if (!['delivered', 'collected', 'cancelled'].includes(status)) {
    trackingHtml = `
      <div class="order-tracking">
        <div class="tracking-track">
          <div class="tracking-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="tracking-steps">
          <div class="step ${currentIdx >= 0 ? 'active' : ''}"><span>📝</span><label>New</label></div>
          <div class="step ${currentIdx >= 1 ? 'active' : ''}"><span>🔥</span><label>Braai</label></div>
          <div class="step ${currentIdx >= 2 ? 'active' : ''}"><span>📦</span><label>Packing</label></div>
          <div class="step ${currentIdx >= 3 ? 'active' : ''}"><span>🚚</span><label>${order.delivery_method === 'delivery' ? 'On Way' : 'Ready'}</label></div>
          <div class="step ${currentIdx >= 4 ? 'active' : ''}"><span>✅</span><label>Done</label></div>
        </div>
      </div>
    `;
  }

  return `
    <div class="order-card-detail">
      <div class="order-card-header">
        <div class="flex-between">
          <div>
            <div class="order-id">#${order.order_number || order.id}</div>
            <div class="order-date">${formatDate(order.created_at)}</div>
          </div>
          <div class="order-status-pill ${badgeClass}">${icon} ${label}</div>
        </div>
      </div>
      <div class="order-card-body">
        <div class="order-items-summary">${itemsText}</div>
        ${trackingHtml}
        <div class="flex-between mt-4">
          <div class="order-foot-info">📍 ${order.delivery_address || (order.delivery_method === 'collect' ? 'Collect at store' : '')}</div>
          <div class="order-card-total">${formatCurrency(order.total)}</div>
        </div>
      </div>
    </div>
  `;
}

// ── Transactions Tab ──────────────────────────
async function renderTransactions() {
  const tbody = document.getElementById('txn-tbody');
  if (!tbody) return;

  try {
    const txns = await API.get('/users/me/transactions');
    if (txns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:40px">No credit transactions yet</td></tr>`;
      return;
    }
    tbody.innerHTML = txns.map(t => `<tr>
      <td>${formatDate(t.created_at)}</td>
      <td class="${t.type === 'purchase' ? 'text-red' : 'text-gold'} font-bold">
        ${t.type === 'purchase' ? '-' : '+'}${formatCurrency(t.amount)}
      </td>
      <td>${t.notes || t.type}</td>
      <td><span class="badge badge-green">✅ ${t.status || 'Completed'}</span></td>
    </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:40px">Could not load transactions</td></tr>`;
  }
}

// ── Credit Info ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const copyRef = document.getElementById('copy-ref-btn');
  if (copyRef) {
    copyRef.addEventListener('click', () => copyToClipboard(currentUser?.refNumber || currentUser?.ref_number || '', copyRef));
  }
});

// ── Profile Tab ───────────────────────────────
function renderProfile() {
  setValue('pf-name', currentUser.name);
  setValue('pf-surname', currentUser.surname);
  setValue('pf-email', currentUser.email);
  setValue('pf-phone', currentUser.phone || '');
  setValue('pf-address', currentUser.address || '');
  setValue('pf-suburb', currentUser.suburb || '');
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profile-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving...';

    try {
      const result = await API.put('/users/me', {
        name: document.getElementById('pf-name').value.trim(),
        surname: document.getElementById('pf-surname').value.trim(),
        phone: document.getElementById('pf-phone').value.trim(),
        address: document.getElementById('pf-address').value.trim(),
        suburb: document.getElementById('pf-suburb').value.trim(),
      });
      currentUser = { ...currentUser, ...result.user };
      renderSidebarUser();
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update profile: ' + err.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Save Changes';
  });

  // Password change — requires backend support
  const pwForm = document.getElementById('password-form');
  if (pwForm) {
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showToast('Password change is not yet available. Please contact support.', 'info');
    });
  }
});
