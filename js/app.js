/* =============================================
   The Peoples Butchery — Powered by yType
   Handles: DB (localStorage), Auth, Utils
   ============================================= */

'use strict';

// ── Constants ──────────────────────────────────
// ── Constants ──────────────────────────────────
const STORE_COORDS = { lat: -25.7219, lng: 28.3412 }; // Updated V2 Store Location
const FLAT_DELIVERY_FEE = 15; // Minimum R15
const RATE_PER_KM = 5; // R5/km for distance-based
const MIN_DISTANCE_KM = 3; // First 3km included in flat fee
const ADMIN_PIN = 'peoplesV2_2024';
const SUPER_ADMIN_PIN = 'yType_Dev_2026';

// ── API Configuration ─────────────────────────
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : 'https://thepeoplesbutchery.co.za/api';

// ── Ticketing & SLA ─────────────────────────
const SLA_WARNING_MINUTES = 20;
const SLA_CRITICAL_MINUTES = 45;

// ── AI Engine Settings ────────────────────────
const AI_TICK_RATE = 10000;       // AI checks state every 10 seconds
const MIN_SLA_MINUTES = 30;       // Escalation trigger
const STATUS_DURATIONS = {
  pending: 1,      // 1 min to start braai/prep
  braai: 5,        // 5 mins on braai
  packaging: 3,    // 3 mins to package
  dispatched: 10   // 10 mins delivery window (simulated)
};

// ── LocalStorage DB ────────────────────────────
const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('nilos_' + key)) || null; }
    catch { return null; }
  },
  set(key, val) {
    localStorage.setItem('nilos_' + key, JSON.stringify(val));
  },
  getList(key) { return this.get(key) || []; },
  saveList(key, list) { this.set(key, list); },

  // Users
  getUsers() { return this.getList('users'); },
  saveUsers(u) { this.saveList('users', u); },
  findUserByEmail(email) { return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()); },
  findUserByRef(ref) { return this.getUsers().find(u => u.refNumber === ref.toUpperCase()); },
  findUserById(id) { return this.getUsers().find(u => u.id === id); },
  updateUser(updated) {
    const users = this.getUsers().map(u => u.id === updated.id ? updated : u);
    this.saveUsers(users);
  },

  // Products
  getProducts() { return this.getList('products'); },
  saveProducts(p) { this.saveList('products', p); },
  findProductById(id) { return this.getProducts().find(p => p.id === id); },
  updateProduct(updated) {
    const prods = this.getProducts().map(p => p.id === updated.id ? updated : p);
    this.saveProducts(prods);
  },

  // Orders
  getOrders() { return this.getList('orders'); },
  saveOrders(o) { this.saveList('orders', o); },
  getUserOrders(userId) { return this.getOrders().filter(o => o.userId === userId); },
  findOrderById(id) { return this.getOrders().find(o => o.id === id); },
  updateOrder(updated) {
    const orders = this.getOrders().map(o => o.id === updated.id ? updated : o);
    this.saveOrders(orders);
  },
  addOrder(order) {
    const orders = this.getOrders();
    orders.push(order);
    this.saveOrders(orders);
  },

  // Transactions
  getTransactions() { return this.getList('transactions'); },
  saveTransactions(t) { this.saveList('transactions', t); },
  addTransaction(txn) {
    const txns = this.getTransactions();
    txns.push(txn);
    this.saveTransactions(txns);
  },
  getUserTransactions(userId) { return this.getTransactions().filter(t => t.userId === userId); },

  // System Settings (D&K Pricing Models)
  getSettings() {
    return this.get('settings') || {
      optA: { setup: 25000, monthly: 2850 },
      optB: { setup: 8500, monthly: 1200, commission: 2.5 }
    };
  },
  saveSettings(s) { this.set('settings', s); },
};

// ── Auth ───────────────────────────────────────
const Auth = {
  SESSION_KEY: 'peoples_session',
  TOKEN_KEY: 'peoples_token',

  login(user, token = null) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({
      id: user.id,
      isAdmin: user.isAdmin || user.is_admin || false,
      name: user.name,
      surname: user.surname,
      email: user.email,
      refNumber: user.refNumber || user.ref_number,
      creditBalance: parseFloat(user.creditBalance || user.credit_balance || 0)
    }));
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
  },
  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    window.location.href = 'login.html';
  },
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },
  getSession() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY)); }
    catch { return null; }
  },
  isLoggedIn() { return !!this.getSession(); },
  isAdmin() { return this.getSession()?.isAdmin === true; },
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  },
  requireAdmin() {
    if (!this.isAdmin()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },
  getCurrentUser() {
    const sess = this.getSession();
    if (!sess) return null;
    return DB.findUserById(sess.id) || sess;
  },
};

// ── API Helper (Simulated Backend) ────────────────
const API = {
  async request(path, options = {}) {
    console.log(`[Mock API] ${options.method || 'GET'} ${path}`);
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 300));
    const token = Auth.getToken();
    const currentUser = Auth.getCurrentUser();
    
    // --- USERS ---
    if (path === '/users/me' && options.method !== 'PUT') {
      if (!currentUser) throw new Error('Not logged in');
      return currentUser;
    }
    if (path === '/users/me' && options.method === 'PUT') {
      const body = JSON.parse(options.body);
      const updated = { ...currentUser, ...body };
      DB.updateUser(updated);
      Auth.login(updated, token);
      return { user: updated };
    }
    if (path === '/users/me/transactions') {
      if (!currentUser) throw new Error('Not logged in');
      return DB.getUserTransactions(currentUser.id);
    }
    
    // --- ADMIN ---
    if (path === '/admin/stats') {
      const orders = DB.getOrders();
      return {
        totalUsers: DB.getUsers().length,
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
        pendingOrders: orders.filter(o => o.status === 'pending').length
      };
    }
    if (path === '/admin/orders') return DB.getOrders();
    if (path === '/admin/users') {
      const users = DB.getUsers();
      return users.filter(u => !u.isAdmin && !u.is_admin);
    }
    if (path.match(/^\/admin\/orders\/([^/]+)\/status$/) && options.method === 'PUT') {
      const id = path.split('/')[3];
      const body = JSON.parse(options.body);
      const order = DB.findOrderById(id);
      if (order) {
        order.status = body.status;
        order.updatedAt = new Date().toISOString();
        DB.updateOrder(order);
      }
      return { success: true };
    }
    if (path.match(/^\/admin\/users\/([^/]+)\/credit$/) && options.method === 'POST') {
      const id = path.split('/')[3];
      const body = JSON.parse(options.body);
      const user = DB.findUserById(id);
      if (!user) throw new Error('User not found');
      user.credit_balance = (parseFloat(user.credit_balance) || 0) + parseFloat(body.amount);
      DB.updateUser(user);
      DB.addTransaction({
        id: generateId('txn_'),
        userId: user.id,
        amount: body.amount,
        type: 'credit',
        notes: body.notes,
        status: 'Completed',
        created_at: new Date().toISOString()
      });
      return { user };
    }
    
    // --- ORDERS ---
    if (path === '/orders' && (!options.method || options.method === 'GET')) {
      if (!currentUser) throw new Error('Not logged in');
      return DB.getUserOrders(currentUser.id);
    }
    
    // --- PRODUCTS ---
    if (path === '/products' && (!options.method || options.method === 'GET')) {
      return DB.getProducts();
    }
    if (path === '/products' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      body.id = generateId('p_');
      const products = DB.getProducts();
      products.push(body);
      DB.saveProducts(products);
      return body;
    }
    if (path.startsWith('/products/') && options.method === 'PUT') {
      const id = path.split('/')[2];
      const body = JSON.parse(options.body);
      const p = DB.findProductById(id);
      if (p) {
        Object.assign(p, body);
        DB.updateProduct(p);
      }
      return p || {};
    }

    // Default fallback to real fetch if unhandled
    const res = await fetch(API_BASE_URL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },
  async get(path, options = {}) { return this.request(path, { ...options, method: 'GET' }); },
  async post(path, body, options = {}) { return this.request(path, { ...options, method: 'POST', body: JSON.stringify(body) }); },
  async put(path, body, options = {}) { return this.request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }); },
  async delete(path, options = {}) { return this.request(path, { ...options, method: 'DELETE' }); },
};

// ── Utilities ──────────────────────────────────
function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function generateRef(name, surname, phone) {
  const initials = (name[0] || '') + (surname[0] || '');
  const lastFour = phone.replace(/\s/g, '').slice(-4);
  return (initials + lastFour).toUpperCase();
}

function ensureUniqueRef(name, surname, phone) {
  let baseRef = generateRef(name, surname, phone);
  let finalRef = baseRef;
  let suffix = '';
  let charCode = 65; // 'A'

  while (DB.findUserByRef(finalRef)) {
    suffix = String.fromCharCode(charCode);
    finalRef = baseRef + suffix;
    charCode++;
    if (charCode > 90) break; // Safety
  }
  return finalRef;
}

// Simple password hashing (SHA-256 equivalent simulation via encode)
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password + 'peoples_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Distance / Delivery ───────────────────────
function toRad(deg) { return deg * (Math.PI / 180); }

function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sin2 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(sin2));
}

function calcDeliveryFee(customerCoords) {
  if (!customerCoords || (!customerCoords.lat && !customerCoords.lng)) return null;
  const km = haversineKm(STORE_COORDS, customerCoords);
  if (km <= MIN_DISTANCE_KM) return FLAT_DELIVERY_FEE;
  return FLAT_DELIVERY_FEE + (Math.ceil(km - MIN_DISTANCE_KM) * RATE_PER_KM);
}

function formatDeliveryFee(fee) {
  if (fee === null) return 'Calculating...';
  if (fee === 0) return 'FREE';
  return `R${fee.toFixed(2)}`;
}

async function geocodeAddress(address) {
  try {
    const q = encodeURIComponent(address + ', Pretoria, South Africa');
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&addressdetails=1`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'ThePeoplesButchery/1.0' }
    });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Toast Notifications ───────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── Currency Formatting ───────────────────────
function formatCurrency(amount) {
  return 'R' + parseFloat(amount || 0).toFixed(2);
}

// ── Date Formatting ───────────────────────────
function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Status Badge HTML ─────────────────────────
function statusBadge(status) {
  const map = {
    pending: ['⏳', 'Pending', 'status-pending'],
    braai: ['🔥', 'On the Braai', 'status-processing'],
    packaging: ['🥡', 'Packaging', 'status-processing'],
    dispatched: ['🚚', 'Dispatched', 'status-delivering'],
    delivered: ['✅', 'Delivered', 'status-delivered'],
    collected: ['🏪', 'Collected', 'status-collected'],
    cancelled: ['❌', 'Cancelled', 'status-cancelled'],
  };
  const [icon, label, cls] = map[status] || ['❓', status, 'badge-gray'];
  return `<span class="badge ${cls}">${icon} ${label}</span>`;
}

// ── Navbar scroll effect ───────────────────────
function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
  nav.classList.toggle('scrolled', window.scrollY > 40);

  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    // Close on nav link tap (mobile)
    navMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navMenu.classList.remove('open');
        hamburger.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
}

// ── Dynamic Navbar ────────────────────────────
function renderNavbar({ active = '', showCart = false, showOrderNow = false } = {}) {
  const placeholder = document.getElementById('app-navbar');
  if (!placeholder) return;

  const isLoggedIn = Auth.isLoggedIn();
  const isAdmin = Auth.isAdmin();
  const accountHref = isAdmin ? 'admin.html' : 'dashboard.html';
  const sess = Auth.getSession();
  const navLabel = isLoggedIn && sess
    ? (sess.name ? `Hi, ${sess.name}` : 'My Account')
    : 'My Account';
  const balanceChip = isLoggedIn && sess && !isAdmin && sess.creditBalance > 0
    ? `<span style="font-size:.75rem;color:var(--success);font-weight:700;margin-left:4px">R${Number(sess.creditBalance).toFixed(2)}</span>`
    : '';

  const homeOnlyLinks = active === 'home' ? `
        <li><a href="#about" class="nav-link">About</a></li>
        <li><a href="#how-it-works" class="nav-link">How It Works</a></li>
        <li><a href="#contact" class="nav-link">Contact</a></li>` : '';

  const cartBtn = showCart
    ? `<button class="btn btn-outline btn-sm btn-icon cart-btn" id="nav-cart-btn" aria-label="Cart">🛒<span class="cart-count" id="nav-cart-count" style="display:none">0</span></button>`
    : '';

  const orderNowBtn = showOrderNow ? `<a href="shop.html" class="btn btn-gold btn-sm">Order Now</a>` : '';

  const mobileActions = `
    <li class="mobile-actions">
      ${!isLoggedIn ? `<a href="login.html" class="btn btn-ghost">Login</a><a href="register.html" class="btn btn-primary" style="font-weight:700">Register Free</a>` : ''}
      ${isLoggedIn ? `<a href="${accountHref}" class="btn btn-primary">${navLabel}${balanceChip}</a>` : ''}
      ${isLoggedIn ? `<button class="btn btn-ghost" id="nav-logout-btn-mobile">Logout</button>` : ''}
      ${orderNowBtn ? `<a href="shop.html" class="btn btn-gold">Order Now</a>` : ''}
    </li>`;

  placeholder.outerHTML = `
  <nav class="navbar" role="navigation">
    <div class="navbar-inner">
      <a href="index.html" class="navbar-brand">
        <div class="brand-logo">🥩</div>
        <span class="brand-name">The Peoples <span>Butchery</span></span>
      </a>
      <ul class="navbar-nav" id="nav-menu">
        <li><a href="index.html" class="nav-link${active === 'home' ? ' active' : ''}">Home</a></li>
        <li><a href="shop.html" class="nav-link${active === 'shop' ? ' active' : ''}">Shop</a></li>${homeOnlyLinks}
        <li${isLoggedIn ? '' : ' class="hidden"'}><a href="${accountHref}" class="nav-link">My Account</a></li>
        ${mobileActions}
      </ul>
      <div class="navbar-actions">
        <a href="login.html" class="btn btn-ghost btn-sm${isLoggedIn ? ' hidden' : ''}" id="nav-login-btn">Login</a>
        <a href="register.html" class="btn btn-primary btn-sm${isLoggedIn ? ' hidden' : ''}" id="nav-register-btn">Register Free</a>
        <a href="${accountHref}" class="btn btn-primary btn-sm${isLoggedIn ? '' : ' hidden'}" id="nav-dash-btn">${navLabel}${balanceChip}</a>
        ${orderNowBtn}${cartBtn}
        <button class="btn btn-ghost btn-sm${isLoggedIn ? '' : ' hidden'}" id="nav-logout-btn">Logout</button>
        <button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
    </div>
  </nav>`;

  initNavbar();

  const logoutHandler = () => { Auth.logout(); window.location.href = 'index.html'; };
  document.getElementById('nav-logout-btn')?.addEventListener('click', logoutHandler);
  document.getElementById('nav-logout-btn-mobile')?.addEventListener('click', logoutHandler);
}

// ── Tabs ──────────────────────────────────────
function initTabs(containerId, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const panel = document.getElementById('tab-' + target);
      if (panel) panel.classList.add('active');
      if (onChange) onChange(target);
    });
  });
}

// ── Sidebar (Dashboard / Admin) ─────────────
function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;
  function openSidebar() { sidebar.classList.add('mobile-open'); if (overlay) overlay.classList.add('open'); }
  function closeSidebar() { sidebar.classList.remove('mobile-open'); if (overlay) overlay.classList.remove('open'); }
  toggle.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);
  // Sidebar nav links
  sidebar.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.addEventListener('click', () => {
      const target = link.dataset.tab;
      sidebar.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const panel = document.getElementById('tab-' + target);
      if (panel) panel.classList.add('active');
      closeSidebar();
    });
  });
}

// ── Copy to Clipboard ─────────────────────────
function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = original, 2000);
  });
}

// ── Product Seeding ───────────────────────────
function seedProducts() {
  if (DB.getProducts().length > 0) return;
  const products = [
    // Raw Meats & Essentials (Extracted from Stock List)
    { id: 'p362', name: 'Beef Knuckles (500g)', category: 'raw', description: 'Fresh beef knuckles for soup/stew.', price: 25.00, unit: 'per pack', stockKg: 50, minStock: 5, image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400', available: true },
    { id: 'p361', name: 'Chicken Necks (500g)', category: 'raw', description: 'Fresh chicken necks.', price: 15.00, unit: 'per pack', stockKg: 40, minStock: 10, image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400', available: true },
    { id: 'p304', name: 'Braai Pak', category: 'raw', description: 'Essential braai selection.', price: 35.00, unit: 'per pack', stockKg: 100, minStock: 20, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400', available: true },
    { id: 'p358', name: 'Bonemeal (5kg)', category: 'raw', description: 'High quality bonemeal for pets/garden.', price: 60.00, unit: 'per bag', stockKg: 200, minStock: 20, image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=400', available: true },
    
    // Cooked Meals
    { id: 'm234', name: 'Briyani Bowl', category: 'cooked', description: 'Fragrant spicy briyani with meat.', price: 50.00, unit: 'per plate', stockKg: 40, minStock: 5, image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?w=400', available: true },
    { id: 'm264', name: 'Beef Rib Pie', category: 'cooked', description: 'Homemade chunky beef rib pie.', price: 22.00, unit: 'per pie', stockKg: 60, minStock: 10, image: 'https://images.unsplash.com/photo-1604467732921-0c5a50f7e4c8?w=400', available: true },
    { id: 'm1', name: 'Traditional Boerewors & Pap', category: 'cooked', description: 'Signature wors with phutu pap.', price: 75, unit: 'per plate', stockKg: 100, minStock: 10, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400', available: true },
    
    // Drinks & Sides
    { id: 's382', name: 'Coke (1.5L)', category: 'raw', description: 'Refreshing 1.5L Coca-Cola.', price: 23.00, unit: 'per bottle', stockKg: 100, minStock: 20, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400', available: true },
    { id: 's343', name: 'Eggs (6-pack)', category: 'raw', description: 'Fresh farm eggs.', price: 15.00, unit: 'per pack', stockKg: 100, minStock: 10, image: 'https://images.unsplash.com/photo-1582722134003-999335f603a1?w=400', available: true },
  ];
  DB.saveProducts(products);
}

// ── Autonomous AI Engine Simulator (localStorage only — disabled on live) ───────────
const AutonomousAI = {
  start() { /* disabled — order state now managed by PostgreSQL ticket system */ },

  tick() {
    const orders = DB.getOrders();
    let updated = false;

    orders.forEach(order => {
      if (['delivered', 'collected', 'cancelled'].includes(order.status)) return;

      const elapsedMs = Date.now() - new Date(order.updatedAt).getTime();
      const elapsedMins = elapsedMs / (1000 * 60);

      // Simple status progression logic
      let nextStatus = null;
      if (order.status === 'pending' && elapsedMins >= STATUS_DURATIONS.pending) {
        nextStatus = order.items.some(i => i.category === 'cooked') ? 'braai' : 'packaging';
      } else if (order.status === 'braai' && elapsedMins >= STATUS_DURATIONS.braai) {
        nextStatus = 'packaging';
      } else if (order.status === 'packaging' && elapsedMins >= STATUS_DURATIONS.packaging) {
        nextStatus = order.deliveryMethod === 'delivery' ? 'dispatched' : 'ready_for_collection';
      } else if (order.status === 'dispatched' && elapsedMins >= STATUS_DURATIONS.dispatched) {
        // AI "detects" delivery completion
        nextStatus = 'delivered';
      }

      if (nextStatus) {
        console.log(`🤖 AI updated Order #${order.id} status to: ${nextStatus}`);
        order.status = nextStatus;
        order.updatedAt = new Date().toISOString();
        updated = true;
      }

      // Escalation Logic
      const lifetimeMs = Date.now() - new Date(order.createdAt).getTime();
      const lifetimeMins = lifetimeMs / (1000 * 60);
      if (lifetimeMins > MIN_SLA_MINUTES && order.status !== 'delivered') {
        order.isEscalated = true;
        updated = true;
        console.warn(`🤖 AI ESCALATED Order #${order.id} due to SLA breach.`);
      }
    });

    if (updated) DB.saveOrders(orders);
  }
};

// ── Admin user seeding ─────────────────────────
async function seedAdmin() {
  const users = DB.getUsers();
  
  // 1. Super Admin (dev@thepeoplesbutchery.co.za)
  if (!users.find(u => u.email === 'dev@thepeoplesbutchery.co.za')) {
    const devHash = await hashPassword('yType@ButcheryV2');
    users.push({
      id: 'usr_super_dev',
      refNumber: 'TPB_Dev',
      name: 'yType',
      surname: 'Dev',
      email: 'dev@thepeoplesbutchery.co.za',
      passwordHash: devHash,
      phone: '0712345678',
      address: '76 Meeu St, East Lynne, Pretoria',
      suburb: 'East Lynne',
      coordinates: STORE_COORDS,
      creditBalance: 1000000,
      createdAt: new Date().toISOString(),
      isAdmin: true,
      isSuperAdmin: true
    });
  }

  // 2. Main Admin
  if (!users.find(u => u.email === 'admin@thepeoplesbutchery.co.za')) {
    const adminHash = await hashPassword('Admin@Peoples2024');
    users.push({
      id: 'admin_001',
      refNumber: 'TPB-ADMIN',
      name: 'Admin',
      surname: 'Admin',
      email: 'admin@thepeoplesbutchery.co.za',
      passwordHash: adminHash,
      phone: '012 345 6789',
      address: '76 Meeu St, East Lynne, Pretoria',
      suburb: 'East Lynne',
      coordinates: STORE_COORDS,
      creditBalance: 0,
      createdAt: new Date().toISOString(),
      isAdmin: true,
    });
  }
  DB.saveUsers(users);
}

// ── Global Floating Actions & AI Chat ───────
// ── Global AI Chat Window ─────────────────────
function initAIChat() {
  const html = `
    <div class="chat-window" id="ai-chat-window">
      <div class="chat-header">
        <div class="chat-status"></div>
        <div style="font-weight:700;font-size:0.9rem">yType — Automate iT | AI Support</div>
      </div>
      <div class="chat-messages" id="chat-messages">
        <div class="msg ai">👋 Hello! I'm the yType Autonomous Agent powering The Peoples Butchery. How can I help you today?</div>
      </div>
      <div class="chat-input-area">
        <input type="text" id="chat-input" class="form-control" placeholder="Ask about your order..." style="font-size:0.85rem">
        <button class="btn btn-primary btn-sm" id="chat-send">Send</button>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.id = 'ai-support-container';
  div.innerHTML = html;
  document.body.appendChild(div);

  const win = document.getElementById('ai-chat-window');
  const send = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  const msgs = document.getElementById('chat-messages');

  window.toggleAIChat = () => {
    if (win) win.classList.toggle('open');
  };

  if (send && input) {
    const sendMessage = () => {
      const text = input.value.trim();
      if (!text) return;

      const userMsg = document.createElement('div');
      userMsg.className = 'msg user';
      userMsg.textContent = text;
      msgs.appendChild(userMsg);
      input.value = '';
      msgs.scrollTop = msgs.scrollHeight;

      // Simulated AI response
      setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'msg ai';
        aiMsg.textContent = generateAIResponse(text);
        msgs.appendChild(aiMsg);
        msgs.scrollTop = msgs.scrollHeight;
      }, 1000);
    };
    send.onclick = sendMessage;
    input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
  }
}

function generateAIResponse(text) {
  const t = text.toLowerCase();
  const user = Auth.getCurrentUser();
  if (t.includes('order') || t.includes('tracking')) {
    if (!user) return "Please log in to track your orders!";
    const lastOrder = DB.getUserOrders(user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (!lastOrder) return "I don't see any orders in your history yet. Want to see our specials?";
    return `Your order #${lastOrder.id} is currently ${statusBadge(lastOrder.status)[1].toLowerCase()}. We're working as fast as possible!`;
  }
  if (t.includes('points') || t.includes('rewards')) {
    return "The Peoples Butchery has moved to a simpler system. We no longer use points. Instead, you can earn credit through our seasonal promotions and referral rewards!";
  }
  if (t.includes('meat') || t.includes('stock')) {
    return "We have fresh T-Bone, Boerewors, and Stewing Beef in stock today. Our AI is predicting high demand so order soon!";
  }
  if (t.includes('sponsorship') || t.includes('community')) {
    return "Neilo and yType are deeply committed to East Lynne! 🤝 I've logged your interest in community sponsorship. Please provide your organization name and the type of support you need, and our management team will review it within 48 hours.";
  }
  return "I'm the yType AI assistant for The Peoples Butchery. I manage stock, track orders, and help with questions. You can ask about your order, account balance, our current stock, or community sponsorship!";
}

// ── Init ──────────────────────────────────────
(async function init() {
  await seedAdmin();
  AutonomousAI.start();
  initAIChat();
})();
