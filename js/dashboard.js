/* =============================================
   The Peoples Butchery — Customer Dashboard
   Live data from Supabase
   ============================================= */

'use strict';

import { supabase } from './supabase-config.js';
import { getUserOrdersFromSupabase } from './supabase-orders.js';

let currentUser = null;
let userOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLogin()) return;

  const sess = Auth.getSession();
  if (!sess) { Auth.logout(); return; }
  if (sess.isAdmin) { window.location.href = 'admin.html'; return; }

  initSidebar();

  // Fetch live user data from Supabase
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', sess.id).single();
    if (error || !data) throw new Error('Could not load profile');
    currentUser = data;
  } catch (err) {
    console.error('User load failed:', err);
    showToast('Could not load your profile', 'error');
    setTimeout(() => Auth.logout(), 2000);
    return;
  }

  // Fetch live orders from Supabase
  try {
    userOrders = await getUserOrdersFromSupabase(sess.id);
  } catch (err) {
    console.warn('Orders load failed, using local fallback:', err);
    userOrders = DB.getUserOrders(sess.id);
  }

  renderSidebarUser();
  renderOverview();
  renderOrders();
  renderTransactions();
  renderProfile();
  setupCopyButtons();

  document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.addEventListener('click', () => showTab(link.dataset.tab));
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout());

  const hash = window.location.hash.replace('#', '');
  if (hash) showTab(hash);
});

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  document.querySelector(`.sidebar-link[data-tab="${tab}"]`)?.classList.add('active');
}

// ── Sidebar ───────────────────────────────────
function renderSidebarUser() {
  document.getElementById('sb-name').textContent = `${currentUser.name} ${currentUser.surname || ''}`;
  document.getElementById('sb-ref').textContent = currentUser.ref_number || '';
  document.getElementById('sb-balance').textContent = formatCurrency(currentUser.credit_balance || 0);
  document.getElementById('sb-avatar').textContent = (currentUser.name || '?')[0].toUpperCase();
}

// ── Overview ──────────────────────────────────
function renderOverview() {
  document.getElementById('ov-balance').textContent = formatCurrency(currentUser.credit_balance || 0);
  document.getElementById('ov-ref').textContent = currentUser.ref_number || '';
  document.getElementById('ov-total-orders').textContent = userOrders.length;

  const active = userOrders.filter(o => ['pending', 'processing', 'delivering', 'braai', 'packaging'].includes(o.status));
  document.getElementById('ov-active-orders').textContent = active.length;

  // Populate all REF and balance fields across tabs
  ['dash-ref-number', 'credit-ref-display', 'pf-ref-display', 'inline-ref'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = currentUser.ref_number || '';
  });
  const balanceEl = document.getElementById('credit-current-balance');
  if (balanceEl) balanceEl.textContent = formatCurrency(currentUser.credit_balance || 0);

  const recentEl = document.getElementById('ov-recent-orders');
  if (!recentEl) return;
  const recent = [...userOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
  recentEl.innerHTML = recent.length === 0
    ? `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No orders yet</div><div class="empty-desc">Head to the shop to place your first order!</div><a href="shop.html" class="btn btn-primary mt-4">Browse Shop</a></div>`
    : recent.map(o => renderOrderCard(o)).join('');
}

// ── Orders ────────────────────────────────────
function renderOrders() {
  const el = document.getElementById('tab-orders');
  if (!el) return;
  const container = el.querySelector('.orders-list');
  if (!container) return;

  const sorted = [...userOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  container.innerHTML = sorted.length === 0
    ? `<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">No orders yet</div><div class="empty-desc">Place your first order and it will appear here.</div><a href="shop.html" class="btn btn-primary mt-4">Go to Shop</a></div>`
    : sorted.map(o => renderOrderCard(o, true)).join('');
}

function renderOrderCard(order, detailed = false) {
  const status = order.status || 'pending';
  const statusMap = {
    pending:    { icon: '⏳', label: 'Pending',              badgeClass: 'status-pending' },
    braai:      { icon: '🔥', label: 'On the Braai',         badgeClass: 'status-processing' },
    packaging:  { icon: '🥡', label: 'Packaging',            badgeClass: 'status-processing' },
    processing: { icon: '🔥', label: 'Processing',           badgeClass: 'status-processing' },
    dispatched: { icon: '🚚', label: 'Dispatched',           badgeClass: 'status-delivering' },
    delivering: { icon: '🚚', label: 'On the Way',           badgeClass: 'status-delivering' },
    ready:      { icon: '✅', label: 'Ready for Collection', badgeClass: 'status-delivered' },
    delivered:  { icon: '✅', label: 'Delivered',            badgeClass: 'status-delivered' },
    collected:  { icon: '🏪', label: 'Collected',            badgeClass: 'status-collected' },
    cancelled:  { icon: '❌', label: 'Cancelled',            badgeClass: 'status-cancelled' },
  };
  const { icon, label, badgeClass } = statusMap[status] || { icon: '❓', label: status, badgeClass: 'badge-gray' };

  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.length || order.total_items || '?';

  const statuses = ['pending', 'braai', 'packaging', 'dispatched', 'delivered'];
  const currentIdx = statuses.indexOf(status);
  const progressPercent = Math.max(0, ((currentIdx + 1) / statuses.length) * 100);

  const trackingHtml = ['delivered', 'collected', 'cancelled'].includes(status) ? '' : `
    <div class="order-tracking">
      <div class="tracking-track"><div class="tracking-fill" style="width:${progressPercent}%"></div></div>
      <div class="tracking-steps">
        <div class="step ${currentIdx >= 0 ? 'active' : ''}"><span>📝</span><label>New</label></div>
        <div class="step ${currentIdx >= 1 ? 'active' : ''}"><span>🔥</span><label>Braai</label></div>
        <div class="step ${currentIdx >= 2 ? 'active' : ''}"><span>📦</span><label>Packing</label></div>
        <div class="step ${currentIdx >= 3 ? 'active' : ''}"><span>🚚</span><label>${order.delivery_method === 'delivery' ? 'On Way' : 'Ready'}</label></div>
        <div class="step ${currentIdx >= 4 ? 'active' : ''}"><span>✅</span><label>Done</label></div>
      </div>
    </div>`;

  return `
    <div class="order-card-detail">
      <div class="order-card-header">
        <div class="flex-between">
          <div>
            <div class="order-id">#${order.id}</div>
            <div class="order-date">${formatDate(order.created_at)}</div>
          </div>
          <div class="order-status-pill ${badgeClass}">${icon} ${label}</div>
        </div>
      </div>
      <div class="order-card-body">
        <div class="order-items-summary">${itemCount} item(s)</div>
        ${trackingHtml}
        <div class="flex-between mt-4">
          <div class="order-foot-info">📍 ${order.delivery_address || (order.delivery_method === 'collect' ? 'Collect at store' : '')}</div>
          <div class="order-card-total">${formatCurrency(order.total)}</div>
        </div>
      </div>
    </div>`;
}

// ── Transactions ──────────────────────────────
async function renderTransactions() {
  const tbody = document.getElementById('txn-tbody');
  if (!tbody) return;

  try {
    const txns = DB.getUserTransactions(currentUser.id);
    if (!txns || txns.length === 0) {
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

// ── Profile ───────────────────────────────────
function renderProfile() {
  setValue('pf-name', currentUser.name);
  setValue('pf-surname', currentUser.surname);
  setValue('pf-email', currentUser.email);
  setValue('pf-phone', currentUser.phone || '');
  setValue('pf-address', currentUser.address || '');
  setValue('pf-suburb', currentUser.suburb || '');

  const refEl = document.getElementById('pf-ref-display');
  if (refEl) refEl.textContent = currentUser.ref_number || '';

  const form = document.getElementById('profile-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving...';

    const updates = {
      name: document.getElementById('pf-name').value.trim(),
      surname: document.getElementById('pf-surname').value.trim(),
      phone: document.getElementById('pf-phone').value.trim(),
      address: document.getElementById('pf-address').value.trim(),
      suburb: document.getElementById('pf-suburb').value.trim(),
    };

    try {
      const { error } = await supabase.from('users').update(updates).eq('id', currentUser.id);
      if (error) throw error;
      currentUser = { ...currentUser, ...updates };
      renderSidebarUser();
      showToast('Profile updated!', 'success');
    } catch (err) {
      showToast('Failed to update profile: ' + err.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Save Changes';
  });

  const pwForm = document.getElementById('password-form');
  if (pwForm) {
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPw = document.getElementById('pw-new').value;
      const confirm = document.getElementById('pw-confirm').value;
      if (newPw.length < 6) { showToast('Password must be at least 6 characters', 'warning'); return; }
      if (newPw !== confirm) { showToast('Passwords do not match', 'warning'); return; }
      try {
        const { error } = await supabase.auth.updateUser({ password: newPw });
        if (error) throw error;
        showToast('Password updated!', 'success');
        pwForm.reset();
      } catch (err) {
        showToast('Password change failed: ' + err.message, 'error');
      }
    });
  }
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// ── Copy buttons ──────────────────────────────
function setupCopyButtons() {
  document.getElementById('copy-ref-btn')?.addEventListener('click', function () {
    copyToClipboard(currentUser.ref_number || '', this);
  });
  document.getElementById('copy-ref-credit-btn')?.addEventListener('click', function () {
    copyToClipboard(currentUser.ref_number || '', this);
  });
}
