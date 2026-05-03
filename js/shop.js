/* =============================================
   The Peoples Butchery — Shop Module (shop.js)
   ============================================= */

'use strict';

import { saveOrderToFirebase } from './firebase-orders.js';
import { LOCAL_CATALOG, mapToProduct } from './catalog.js';

// ── State ──────────────────────────────────────
let cart = [];
let apiProducts = [];
let activeFilter = 'all';
let deliveryMethod = 'delivery';
let productExtras = {};
let deliveryCoords = null;

// ── Product Helpers ────────────────────────────
function findProduct(id) {
  return apiProducts.find(p => p.id === String(id));
}

async function loadProductsFromAPI() {
  try {
    const { db } = await import('./firebase-config.js');
    const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const snap = await getDocs(query(collection(db, 'products'), where('is_active', '==', true)));
    if (snap.size > 0) {
      apiProducts = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      return;
    }
  } catch (err) {
    console.warn('Firestore products unavailable, using local catalog:', err);
  }
  apiProducts = LOCAL_CATALOG.map(mapToProduct);
}

// ── Cart from Session ──────────────────────────
function loadCart() {
  try { cart = JSON.parse(sessionStorage.getItem('nilos_cart')) || []; }
  catch { cart = []; }
}
function saveCart(fullRender = true) {
  sessionStorage.setItem('nilos_cart', JSON.stringify(cart));
  if (fullRender) updateCartUI();
  else renderCartPanel();
}

// ── Weight helper ──────────────────────────────
function isWeightBased(product) {
  return /kg/i.test(product.unit || '');
}

// ── Cart Operations ────────────────────────────
function addToCart(productId, qty = 1) {
  const product = findProduct(productId);
  if (!product || !product.available) return;
  const qty_n = parseFloat(qty);
  const existing = cart.find(c => c.productId === productId);
  if (existing) { existing.qty = parseFloat((existing.qty + qty_n).toFixed(3)); }
  else { cart.push({ productId, qty: qty_n }); }
  saveCart();
  showToast(product.name + ' added to cart!', 'success');
}

// Add a weight-based product using the kg input on the card
window.addWeightToCart = (productId) => {
  const kgInput = document.getElementById('wi-' + productId);
  const weight = parseFloat(kgInput?.value || 0.5);
  if (isNaN(weight) || weight < 0.25) {
    showToast('Minimum order is 0.25 kg', 'warning');
    return;
  }
  const product = findProduct(productId);
  if (!product || !product.available) return;
  const existing = cart.find(c => c.productId === productId);
  if (existing) {
    existing.qty = parseFloat(weight.toFixed(3));
  } else {
    cart.push({ productId, qty: parseFloat(weight.toFixed(3)) });
  }
  saveCart(); // triggers updateCartUI → renderProducts
  showToast(`${weight} kg of ${product.name} added!`, 'success');
};

// Update weight directly when input changes for an in-cart item
window.updateCartWeight = (productId, val) => {
  const weight = parseFloat(val);
  if (isNaN(weight) || weight < 0.25) return;
  const item = cart.find(c => c.productId === productId);
  if (!item) return;
  item.qty = parseFloat(weight.toFixed(3));
  saveCart();
};

// Live price preview below the weight input
// kg changed → mirror into price input only (no re-render)
window.syncFromKg = (productId) => {
  const kgInput = document.getElementById('wi-' + productId);
  const priceInput = document.getElementById('pi-' + productId);
  const p = findProduct(productId);
  if (!kgInput || !priceInput || !p) return;
  const kg = parseFloat(kgInput.value) || 0;
  priceInput.value = kg > 0 ? (kg * p.price).toFixed(2) : '';
};

// price changed → mirror into kg input only (no re-render)
window.syncFromPrice = (productId) => {
  const kgInput = document.getElementById('wi-' + productId);
  const priceInput = document.getElementById('pi-' + productId);
  const p = findProduct(productId);
  if (!kgInput || !priceInput || !p || !p.price) return;
  const rand = parseFloat(priceInput.value) || 0;
  const kg = rand > 0 ? parseFloat((rand / p.price).toFixed(3)) : 0;
  kgInput.value = kg > 0 ? kg.toFixed(2) : '';
};

// Commit weight to cart on blur — updates cart data + cart panel without re-rendering products
window.commitWeight = (productId) => {
  const kgInput = document.getElementById('wi-' + productId);
  const kg = parseFloat(kgInput?.value) || 0;
  if (kg < 0.25) return;
  const item = cart.find(c => c.productId === productId);
  if (item) {
    item.qty = parseFloat(kg.toFixed(3));
    saveCart(false); // cart panel only, no product grid re-render
  }
};

function removeFromCart(productId) {
  cart = cart.filter(c => c.productId !== productId);
  saveCart();
}

function updateCartQty(productId, change) {
  const item = cart.find(c => c.productId === productId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + change);
  saveCart();
}

function clearCart() {
  cart = [];
  saveCart();
}

function getCartTotal() {
  return cart.reduce((sum, item) => {
    const p = findProduct(item.productId);
    if (!p) return sum;
    const extras = productExtras[item.productId] || {};
    const extraCost = (extras.braai ? 10 : 0) + (extras.pap ? 10 : 0);
    return sum + ((p.price + extraCost) * item.qty);
  }, 0);
}

function getCartCount() {
  return cart.length; // count unique lines, not qty (avoids fractional badge)
}

// ── Delivery Fee ───────────────────────────────
function calcDelivFee() {
  if (!deliveryCoords) return null;
  const km = haversineKm(STORE_COORDS, deliveryCoords);
  return Math.max(10, Math.round(km * 5));
}

// ── Render Products ────────────────────────────
function renderProducts() {
  const container = document.getElementById('products-grid');
  if (!container) return;

  const all = apiProducts.filter(p => p.available);
  const products = all
    .filter(p => activeFilter === 'all' || p.category === activeFilter)
    .sort((a, b) => (b.category === 'cooked') - (a.category === 'cooked'));

  const countAllEl = document.getElementById('count-all');
  const countRawEl = document.getElementById('count-raw');
  const countCookedEl = document.getElementById('count-cooked');
  const countLabelEl = document.getElementById('product-count-label');
  if (countAllEl) countAllEl.textContent = all.length;
  if (countRawEl) countRawEl.textContent = all.filter(p => p.category === 'raw').length;
  if (countCookedEl) countCookedEl.textContent = all.filter(p => p.category === 'cooked').length;
  if (countLabelEl) countLabelEl.textContent = all.length + ' products available';

  if (products.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🥩</div>
      <div class="empty-title">No products found</div>
      <div class="empty-desc">Try a different filter</div>
    </div>`;
    return;
  }

  container.innerHTML = products.map(p => {
    const cartItem = cart.find(c => c.productId === p.id);
    const extras = productExtras[p.id] || {};
    const basePrice = p.price + (extras.braai ? 10 : 0) + (extras.pap ? 10 : 0);
    const weighted = isWeightBased(p);
    const catBadge = p.category === 'cooked'
      ? '<span class="badge badge-gold">🍽️ Cooked Meal</span>'
      : `<span class="badge badge-red">🥩 ${p.categoryLabel}</span>`;

    let cartControl;
    if (weighted) {
      const currentKg = cartItem ? cartItem.qty : 0.5;
      const currentRand = parseFloat((currentKg * basePrice).toFixed(2));
      const inCart = !!cartItem;
      cartControl = `
        <div class="weight-ctrl${inCart ? ' in-cart' : ''}">
          <div class="weight-dual-row">
            <div class="weight-field">
              <input type="number" class="weight-inp" id="wi-${p.id}"
                value="${currentKg.toFixed(2)}" min="0.25" max="20" step="0.25"
                oninput="syncFromKg('${p.id}')"
                onblur="commitWeight('${p.id}')">
              <span class="weight-lbl">kg</span>
            </div>
            <span class="weight-sep">↔</span>
            <div class="weight-field">
              <span class="weight-lbl">R</span>
              <input type="number" class="weight-inp" id="pi-${p.id}"
                value="${currentRand.toFixed(2)}" min="0" step="1"
                oninput="syncFromPrice('${p.id}')"
                onblur="commitWeight('${p.id}')">
            </div>
          </div>
          ${inCart
            ? `<button class="btn btn-outline btn-sm" style="color:var(--error);border-color:var(--error);width:100%" onclick="removeItem('${p.id}')">✓ In Cart — Remove</button>`
            : `<button class="btn btn-primary btn-sm" style="width:100%" onclick="addWeightToCart('${p.id}')">Add to Cart</button>`
          }
        </div>`;
    } else {
      const qty = cartItem ? cartItem.qty : 0;
      cartControl = qty === 0
        ? `<button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}')">Add to Cart</button>`
        : `<div class="qty-control">
             <button class="qty-btn" onclick="updateQtyUI('${p.id}',-1)">−</button>
             <span class="qty-display">${qty}</span>
             <button class="qty-btn" onclick="updateQtyUI('${p.id}',1)">+</button>
           </div>`;
    }

    return `<div class="product-card" id="pc-${p.id}">
        <div class="product-img">
          <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='assets/img/food/meat_on_braai.jpg'">
          <div class="product-category-tag">${catBadge}</div>
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.description}</div>
          ${p.braaiable ? `<div class="product-extras">
            <label class="extra-toggle ${extras.braai ? 'active' : ''}" onclick="toggleExtra('${p.id}','braai')">
              🔥 Add Braai <span>+R10</span>
            </label>
            <label class="extra-toggle ${extras.pap ? 'active' : ''}" onclick="toggleExtra('${p.id}','pap')">
              🍚 Add Pap <span>+R10</span>
            </label>
          </div>` : ''}
          <div class="product-footer">
            <div>
              <div class="product-price">${formatCurrency(basePrice)}</div>
              <div class="product-unit">${p.unit}</div>
            </div>
            ${weighted ? '' : cartControl}
          </div>
          ${weighted ? `<div class="weight-ctrl-wrap">${cartControl}</div>` : ''}
        </div>
      </div>`;
  }).join('\n');
}

function updateQtyUI(productId, change) {
  updateCartQty(productId, change);
  renderProducts();
}

function toggleExtra(productId, type) {
  if (!productExtras[productId]) productExtras[productId] = {};
  productExtras[productId][type] = !productExtras[productId][type];
  renderProducts();
}

// ── Render Cart Panel ──────────────────────────
function renderCartPanel() {
  const itemsEl = document.getElementById('cart-items');
  const countEl = document.getElementById('cart-count');
  const navCountEl = document.getElementById('nav-cart-count');
  if (!itemsEl) return;

  const count = getCartCount();
  if (countEl) countEl.textContent = count;
  if (navCountEl) { navCountEl.textContent = count; navCountEl.style.display = count > 0 ? 'flex' : 'none'; }

  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty">
      <div class="cart-empty-icon">🛒</div>
      <p>Your cart is empty</p>
      <p style="font-size:0.8rem;color:var(--text-muted)">Add some meat to get started!</p>
    </div>`;
  } else {
    itemsEl.innerHTML = cart.map(item => {
      const p = findProduct(item.productId);
      if (!p) return '';
      const extras = productExtras[item.productId] || {};
      const extraCost = (extras.braai ? 10 : 0) + (extras.pap ? 10 : 0);
      const unitPrice = p.price + extraCost;
      const lineTotal = unitPrice * item.qty;
      const qtyLabel = isWeightBased(p)
        ? `${item.qty} kg × ${formatCurrency(unitPrice)}/kg`
        : `${item.qty} × ${formatCurrency(unitPrice)}`;
      return `<div class="cart-item">
        <div class="cart-item-img"><img src="${p.image}" alt="${p.name}" onerror="this.src='assets/img/food/meat_on_braai.jpg'"></div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">${qtyLabel}</div>
          <div class="cart-item-price">${formatCurrency(lineTotal)}</div>
        </div>
        <button class="cart-item-remove" onclick="removeItem('${p.id}')">✕</button>
      </div>`;
    }).join('');
  }

  const subtotal = getCartTotal();
  const delivFee = deliveryMethod === 'collect' ? 0 : (calcDelivFee() ?? null);
  const total = subtotal + (delivFee ?? 0);

  const delivLabel = deliveryMethod === 'collect'
    ? 'Free (Collect)'
    : delivFee === null
      ? '<span style="color:var(--text-muted);font-size:0.8rem">Enter address above</span>'
      : formatCurrency(delivFee);

  const summaryEl = document.getElementById('cart-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="cart-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
      <div class="cart-row"><span>Delivery</span><span>${delivLabel}</span></div>
      <div class="cart-row total"><span>Total</span><span>${delivFee === null && deliveryMethod === 'delivery' ? '—' : formatCurrency(total)}</span></div>
    `;
  }
}

function removeItem(productId) {
  removeFromCart(productId);
  renderProducts();
}

// ── Delivery Method Toggle ─────────────────────
function setDeliveryMethod(method) {
  deliveryMethod = method;
  document.querySelectorAll('.delivery-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.method === method);
  });
  const locRow = document.getElementById('delivery-location-row');
  if (locRow) locRow.style.display = method === 'delivery' ? 'block' : 'none';
  renderCartPanel();
}

// ── Delivery Location ──────────────────────────
function initDeliveryLocation() {
  const input = document.getElementById('delivery-addr-input');
  const locateBtn = document.getElementById('locate-btn');
  const suggestionsEl = document.getElementById('delivery-suggestions');
  const distanceTag = document.getElementById('delivery-distance-tag');

  if (!input) return;

  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    suggestionsEl.innerHTML = '';
    distanceTag.textContent = '';
    deliveryCoords = null;
    renderCartPanel();

    const q = input.value.trim();
    if (q.length < 3) return;

    debounceTimer = setTimeout(async () => {
      suggestionsEl.innerHTML = '<div class="delivery-suggestion-item" style="opacity:0.5">Searching...</div>';
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${STORE_COORDS.lat}&lon=${STORE_COORDS.lng}&limit=5&lang=en`;
        const res = await fetch(url);
        const data = await res.json();
        const results = (data.features || []).filter(f => {
          const c = f.properties.country_code;
          return !c || c === 'za';
        });
        suggestionsEl.innerHTML = '';
        if (!results.length) {
          suggestionsEl.innerHTML = '<div class="delivery-suggestion-item" style="opacity:0.5">No results found</div>';
          return;
        }
        results.forEach(r => {
          const p = r.properties;
          const street = p.housenumber ? `${p.housenumber} ${p.street || ''}` : (p.street || p.name || '');
          const area = p.suburb || p.district || p.city || '';
          const label = [street, area].filter(Boolean).join(', ') || p.name || 'Unknown';
          const [lng, lat] = r.geometry.coordinates;
          const item = document.createElement('div');
          item.className = 'delivery-suggestion-item';
          item.textContent = label;
          item.addEventListener('click', () => {
            input.value = label;
            suggestionsEl.innerHTML = '';
            setDeliveryCoords({ lat, lng }, distanceTag);
          });
          suggestionsEl.appendChild(item);
        });
      } catch {
        suggestionsEl.innerHTML = '<div class="delivery-suggestion-item" style="opacity:0.5">Search failed, try again</div>';
      }
    }, 600);
  });

  locateBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported by your browser', 'warning');
      return;
    }
    locateBtn.textContent = '⏳';
    locateBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        locateBtn.textContent = '📍';
        locateBtn.disabled = false;
        suggestionsEl.innerHTML = '';
        input.value = 'Your current location';
        setDeliveryCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }, distanceTag);
      },
      () => {
        locateBtn.textContent = '📍';
        locateBtn.disabled = false;
        showToast('Could not get your location', 'error');
      }
    );
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#delivery-location-row')) suggestionsEl.innerHTML = '';
  });
}

function setDeliveryCoords(coords, distanceTag) {
  deliveryCoords = coords;
  const km = haversineKm(STORE_COORDS, coords);
  const fee = Math.max(10, Math.round(km * 5));
  distanceTag.textContent = `📍 ${km.toFixed(1)} km away · Delivery fee: R${fee}`;
  renderCartPanel();
}

// ── Full Cart UI Update ────────────────────────
function updateCartUI() {
  renderCartPanel();
  renderProducts();
}

// ── Cart Panel Open/Close ──────────────────────
function openCart() {
  document.getElementById('cart-panel')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
}
function closeCart() {
  document.getElementById('cart-panel')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
}

// ── Filter Buttons ─────────────────────────────
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderProducts();
    });
  });
}

// ── Checkout ──────────────────────────────────
async function checkout() {
  if (!Auth.isLoggedIn()) {
    showToast('Please login or register to checkout', 'warning');
    setTimeout(() => window.location.href = 'login.html?redirect=shop.html', 1500);
    return;
  }
  if (cart.length === 0) { showToast('Your cart is empty!', 'warning'); return; }

  if (deliveryMethod === 'delivery' && !deliveryCoords) {
    showToast('Please enter your delivery address or use the locate button', 'warning');
    document.getElementById('delivery-addr-input')?.focus();
    return;
  }

  // Fetch live credit balance before placing order
  let user;
  try {
    user = await API.get('/users/me');
  } catch (err) {
    showToast('Could not verify your account. Please log in again.', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  const subtotal = getCartTotal();
  const delivFee = deliveryMethod === 'collect' ? 0 : Math.max(10, Math.round(haversineKm(STORE_COORDS, deliveryCoords) * 5));
  const total = subtotal + delivFee;

  if (parseFloat(user.credit_balance) < total) {
    showToast(`Insufficient credit. Balance: ${formatCurrency(user.credit_balance)}, Required: ${formatCurrency(total)}`, 'error', 6000);
    setTimeout(() => window.location.href = 'dashboard.html#credits', 2000);
    return;
  }

  try {
    // Save order to Firebase
    const orderId = await saveOrderToFirebase({
      items: cart.map(c => ({ productId: c.productId, quantity: c.qty })),
      subtotal: subtotal,
      deliveryFee: delivFee,
      total: total,
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'delivery'
        ? document.getElementById('delivery-addr-input')?.value
        : 'Collect at The Peoples Butchery, 76 Meeu St, East Lynne',
      deliveryCoordinates: deliveryCoords || null,
    });

    // Save to local mock DB for the dashboards
    DB.addOrder({
      id: orderId,
      userId: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      items: cart.map(c => ({ productId: c.productId, quantity: c.qty })),
      subtotal: subtotal,
      deliveryFee: delivFee,
      total: total,
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'delivery'
        ? document.getElementById('delivery-addr-input')?.value
        : 'Collect at The Peoples Butchery, 76 Meeu St, East Lynne',
      status: 'pending',
      created_at: new Date().toISOString()
    });

    // Also send to backend API if available (for legacy support)
    try {
      await API.post('/orders', {
        firebaseId: orderId,
        items: cart.map(c => ({ productId: c.productId, quantity: c.qty })),
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'delivery'
          ? document.getElementById('delivery-addr-input')?.value
          : 'Collect at The Peoples Butchery, 76 Meeu St, East Lynne',
        deliveryCoordinates: deliveryCoords || null,
      });
    } catch (apiErr) {
      console.log('Backend API not available, order saved to Firebase and Mock DB only');
    }

    clearCart();
    closeCart();
    showToast('🎉 Order placed successfully! Order ID: ' + orderId, 'success', 5000);
    setTimeout(() => window.location.href = 'dashboard.html', 2000);
  } catch (err) {
    showToast('Order failed: ' + err.message, 'error', 6000);
  }
}

// ── Init Shop ──────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('products-grid')) return;

  loadCart();
  initFilters();
  initNavbar();
  initDeliveryLocation();

  const grid = document.getElementById('products-grid');
  if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⏳</div><div class="empty-title">Loading products...</div></div>`;

  await loadProductsFromAPI();
  renderProducts();
  updateCartUI();

  document.getElementById('cart-toggle-btn')?.addEventListener('click', openCart);
  document.getElementById('nav-cart-btn')?.addEventListener('click', openCart);
  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
  document.getElementById('checkout-btn')?.addEventListener('click', checkout);
  document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
    clearCart();
    showToast('Cart cleared', 'info');
  });

  document.querySelectorAll('.delivery-option').forEach(el => {
    el.addEventListener('click', () => setDeliveryMethod(el.dataset.method));
  });

  const searchInput = document.getElementById('product-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      apiProducts.forEach(p => {
        const card = document.getElementById('pc-' + p.id);
        if (card) {
          const visible = p.name.toLowerCase().includes(q);
          card.style.display = visible ? '' : 'none';
        }
      });
    });
  }

  updateNavAuth();
});

function updateNavAuth() {
  const loginBtn = document.getElementById('nav-login-btn');
  const dashBtn = document.getElementById('nav-dash-btn');
  const logoutBtn = document.getElementById('nav-logout-btn');
  if (Auth.isLoggedIn()) {
    loginBtn?.classList.add('hidden');
    dashBtn?.classList.remove('hidden');
    logoutBtn?.classList.remove('hidden');
  } else {
    loginBtn?.classList.remove('hidden');
    dashBtn?.classList.add('hidden');
    logoutBtn?.classList.add('hidden');
  }
  logoutBtn?.addEventListener('click', () => Auth.logout());
}

// Expose functions to window for HTML inline event handlers
window.addToCart = addToCart;
window.updateQtyUI = updateQtyUI;
window.toggleExtra = toggleExtra;
window.removeItem = removeItem;
