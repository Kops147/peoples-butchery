/* =============================================
   The Peoples Butchery — Shop Module (shop.js)
   ============================================= */

'use strict';

import { supabase } from './supabase-config.js';
import { saveOrderToSupabase } from './supabase-orders.js';
import { LOCAL_CATALOG, mapToProduct } from './catalog.js';

// ── State ──────────────────────────────────────
let cart = [];
let apiProducts = [];
let activeFilter = 'all';
let deliveryMethod = 'delivery';
let productExtras = {};
let deliveryCoords = null;
let usePoints = false;

// ── Product Helpers ────────────────────────────
function findProduct(id) {
  return apiProducts.find(p => p.id === String(id));
}

async function loadProductsFromAPI() {
  console.log('Loading products...');
  console.log('LOCAL_CATALOG available:', typeof LOCAL_CATALOG, Array.isArray(LOCAL_CATALOG), LOCAL_CATALOG?.length);
  
  const container = document.getElementById('products-grid');
  
  // 1. Load from local catalog immediately as a baseline
  try {
    if (typeof LOCAL_CATALOG !== 'undefined' && Array.isArray(LOCAL_CATALOG) && LOCAL_CATALOG.length > 0) {
      const mapped = LOCAL_CATALOG.map(mapToProduct);
      console.log('Local catalog mapped successfully:', mapped.length, 'products');
      apiProducts = mapped;
      renderProducts();
    } else {
      console.error('LOCAL_CATALOG is empty or invalid:', { type: typeof LOCAL_CATALOG, isArray: Array.isArray(LOCAL_CATALOG), length: LOCAL_CATALOG?.length });
      if (container) {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Catalog Error</div>
          <div class="empty-desc">Could not load products. Please try refreshing the page.</div>
        </div>`;
      }
    }
  } catch (err) {
    console.error('Error mapping local catalog:', err);
    if (container) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">❌</div>
        <div class="empty-title">Error Loading Products</div>
        <div class="empty-desc">${err.message}</div>
      </div>`;
    }
  }

  // 2. Try to fetch fresh data from Supabase in the background
  try {
    console.log('Attempting to fetch from Supabase...');
    // Add a small timeout for the Supabase call
    const fetchPromise = supabase.from('products').select('*').eq('is_active', true);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase timeout')), 5000));
    
    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (error) {
      console.warn('Supabase error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Supabase products loaded:', data.length);
      apiProducts = data.map(p => ({ 
        ...p, 
        id: String(p.id),
        available: p.is_active !== false,
        image: p.image || p.image_url || 'assets/img/food/meat_on_braai.jpg',
        categoryLabel: p.category_label || p.category
      }));
      renderProducts();
    }
  } catch (err) {
    console.warn('Supabase products unavailable, staying with local catalog:', err.message);
  } finally {
    // Final check: if we are still "loading" and have products, render them
    if (container && container.querySelector('.empty-icon')?.textContent === '⏳' && apiProducts.length > 0) {
      renderProducts();
    }
  }
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

// ── Unit helpers ───────────────────────────────
function isWeightBased(product) {
  return /kg/i.test(product.unit || '');
}
function isQtyBased(product) {
  return /each/i.test(product.unit || '');
}
function isBraaible(product) {
  if (!product || product.category === 'cooked') return false;
  // Exclude Lamb Tripe (37) and Frozen Chicken Hearts (1166) — can't be braai'd
  return !new Set(['37', '1166']).has(String(product.id));
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
    saveCart(false);
  }
};

// ── Qty-based (each) cart helpers ─────────────
window.addQtyToCart = (productId) => {
  const qtyInput = document.getElementById('qi-' + productId);
  const qty = parseInt(qtyInput?.value || 1);
  if (isNaN(qty) || qty < 1) { showToast('Minimum order is 1', 'warning'); return; }
  const product = findProduct(productId);
  if (!product || !product.available) return;
  const existing = cart.find(c => c.productId === productId);
  if (existing) { existing.qty = qty; } else { cart.push({ productId, qty }); }
  saveCart();
  showToast(`${qty}× ${product.name} added!`, 'success');
};

window.syncFromQty = (productId) => {
  const qtyInput = document.getElementById('qi-' + productId);
  const totalInput = document.getElementById('ti-' + productId);
  const p = findProduct(productId);
  if (!qtyInput || !totalInput || !p) return;
  const qty = parseInt(qtyInput.value) || 0;
  totalInput.value = qty > 0 ? (qty * p.price).toFixed(2) : '';
};

window.syncFromTotal = (productId) => {
  const qtyInput = document.getElementById('qi-' + productId);
  const totalInput = document.getElementById('ti-' + productId);
  const p = findProduct(productId);
  if (!qtyInput || !totalInput || !p || !p.price) return;
  const rand = parseFloat(totalInput.value) || 0;
  const qty = rand > 0 ? Math.max(1, Math.round(rand / p.price)) : 0;
  qtyInput.value = qty > 0 ? qty : '';
};

window.commitQty = (productId) => {
  const qtyInput = document.getElementById('qi-' + productId);
  const qty = parseInt(qtyInput?.value) || 0;
  if (qty < 1) return;
  const item = cart.find(c => c.productId === productId);
  if (item) { item.qty = qty; saveCart(false); }
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
  const subtotal = cart.reduce((sum, item) => {
    const p = findProduct(item.productId);
    if (!p) return sum;
    const extras = productExtras[item.productId] || {};
    const extraCost = (extras.braai ? 10 : 0) + (extras.pap || 0) * 10;
    return sum + ((p.price + extraCost) * item.qty);
  }, 0);

  if (usePoints && typeof Auth !== 'undefined') {
    const user = Auth.getCurrentUser();
    const pointsValue = (user?.points || 0) / 10;
    return Math.max(0, subtotal - pointsValue);
  }
  return subtotal;
}

window.toggleUsePoints = () => {
  usePoints = !usePoints;
  const btn = document.getElementById('use-points-btn');
  if (btn) btn.classList.toggle('active', usePoints);
  renderCartPanel();
};

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
  console.log('Rendering products. Count:', apiProducts.length);
  const container = document.getElementById('products-grid');
  if (!container) return;

  try {
    // Ensure all products have a baseline of required fields
    const all = apiProducts.filter(p => p && (p.available !== false));
    
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
      try {
        const cartItem = cart.find(c => c.productId === String(p.id));
        const extras = productExtras[p.id] || {};
        const basePrice = parseFloat(p.price || 0) + (extras.braai ? 10 : 0) + (extras.pap || 0) * 10;
        const weighted = isWeightBased(p);
        const catLabel = p.categoryLabel || p.category || 'Meat';
        
        const catBadge = (p.category === 'cooked' || catLabel === 'Other' || catLabel === 'Sides')
          ? '<span class="badge badge-gold">🍽️ Cooked Meal</span>'
          : `<span class="badge badge-red">🥩 ${catLabel}</span>`;

        const qtyBased = isQtyBased(p);
        const prodImage = p.image || p.image_url || 'assets/img/food/meat_on_braai.jpg';

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
        } else if (qtyBased) {
          const currentQty = cartItem ? cartItem.qty : 1;
          const currentTotal = parseFloat((currentQty * basePrice).toFixed(2));
          const inCart = !!cartItem;
          cartControl = `
            <div class="weight-ctrl${inCart ? ' in-cart' : ''}">
              <div class="weight-dual-row">
                <div class="weight-field">
                  <input type="number" class="weight-inp" id="qi-${p.id}"
                    value="${currentQty}" min="1" max="100" step="1"
                    oninput="syncFromQty('${p.id}')"
                    onblur="commitQty('${p.id}')">
                  <span class="weight-lbl">each</span>
                </div>
                <span class="weight-sep">↔</span>
                <div class="weight-field">
                  <span class="weight-lbl">R</span>
                  <input type="number" class="weight-inp" id="ti-${p.id}"
                    value="${currentTotal.toFixed(2)}" min="0" step="1"
                    oninput="syncFromTotal('${p.id}')"
                    onblur="commitQty('${p.id}')">
                </div>
              </div>
              ${inCart
                ? `<button class="btn btn-outline btn-sm" style="color:var(--error);border-color:var(--error);width:100%" onclick="removeItem('${p.id}')">✓ In Cart — Remove</button>`
                : `<button class="btn btn-primary btn-sm" style="width:100%" onclick="addQtyToCart('${p.id}')">Add to Cart</button>`
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

        const usesInputCtrl = weighted || qtyBased;

        return `<div class="product-card" id="pc-${p.id}">
            <div class="product-img">
              <img src="${prodImage}" alt="${p.name}" loading="lazy" onerror="this.src='assets/img/food/meat_on_braai.jpg'">
              <div class="product-category-tag">${catBadge}</div>
            </div>
            <div class="product-info">
              <div class="product-name">${p.name}</div>
              <div class="product-desc">${p.description || ''}</div>
              ${isBraaible(p) ? `<div class="product-extras">
                <label class="extra-toggle ${extras.braai ? 'active' : ''}" onclick="toggleExtra('${p.id}','braai')">
                  🔥 Add Braai <span>+R10</span>
                </label>
                <div class="pap-ctrl">
                  <span class="pap-label">🍚 Pap</span>
                  <button class="pap-btn" onclick="adjustPap('${p.id}',-1)" ${(extras.pap||0)===0?'disabled':''}>−</button>
                  <span class="pap-count">${extras.pap || 0}</span>
                  <button class="pap-btn" onclick="adjustPap('${p.id}',1)">+</button>
                  <span class="pap-price">${(extras.pap||0) > 0 ? `+R${(extras.pap*10).toFixed(0)}` : 'R10/ea'}</span>
                </div>
              </div>` : ''}
              <div class="product-footer">
                <div>
                  <div class="product-price">${typeof formatCurrency === 'function' ? formatCurrency(basePrice) : 'R' + basePrice.toFixed(2)}</div>
                  <div class="product-unit">${p.unit || ''}</div>
                </div>
                ${usesInputCtrl ? '' : cartControl}
              </div>
              ${usesInputCtrl ? `<div class="weight-ctrl-wrap" style="margin-top:12px">${cartControl}</div>` : ''}
            </div>
          </div>`;
      } catch (err) {
        console.error('Error rendering individual product card:', p, err);
        return '';
      }
    }).join('');
  } catch (err) {
    console.error('Critical error in renderProducts:', err);
    container.innerHTML = `<div class="alert alert-error">Error loading product list. Please try refreshing.</div>`;
  }
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
window.adjustPap = function(productId, delta) {
  if (!productExtras[productId]) productExtras[productId] = {};
  productExtras[productId].pap = Math.max(0, Math.min(20, (productExtras[productId].pap || 0) + delta));
  renderProducts();
};

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
      const extraCost = (extras.braai ? 10 : 0) + (extras.pap || 0) * 10;
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
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${STORE_COORDS.lat}&lon=${STORE_COORDS.lng}&limit=5&lang=en&bbox=27.8,-25.9,28.7,-25.5`;
        const res = await fetch(url);
        const data = await res.json();
        const results = (data.features || []).filter(f => {
          const c = f.properties.country_code;
          const [lng, lat] = f.geometry.coordinates;
          // Strict bounding box filter: 27.8,-25.9,28.7,-25.5
          const inBox = lng >= 27.8 && lng <= 28.7 && lat >= -25.9 && lat <= -25.5;
          return (!c || c === 'za') && inBox;
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

  // Fetch live credit balance from Supabase
  const session = Auth.getSession();
  let user;
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', session.id).single();
    if (error || !data) throw new Error('Could not verify account');
    user = { ...data, creditBalance: parseFloat(data.credit_balance) || 0 };
  } catch (err) {
    showToast('Could not verify your account. Please log in again.', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  const subtotal = getCartTotal();
  const delivFee = deliveryMethod === 'collect' ? 0 : Math.max(10, Math.round(haversineKm(STORE_COORDS, deliveryCoords) * 5));
  const total = subtotal + delivFee;

  if (user.creditBalance < total) {
    showToast(`Insufficient credit. Balance: ${formatCurrency(user.creditBalance)}, Required: ${formatCurrency(total)}`, 'error', 6000);
    setTimeout(() => window.location.href = 'dashboard.html#credits', 2000);
    return;
  }

  const deliveryAddress = deliveryMethod === 'delivery'
    ? document.getElementById('delivery-addr-input')?.value
    : 'Collect at The Peoples Butchery, 76 Meeu St, East Lynne';

  try {
    const orderId = await saveOrderToSupabase({
      userId: user.id,
      userEmail: user.email,
      items: cart.map(c => {
        const ex = productExtras[c.productId] || {};
        return { productId: c.productId, quantity: c.qty, braai: !!ex.braai, pap: ex.pap || 0 };
      }),
      subtotal,
      deliveryFee: delivFee,
      total,
      deliveryMethod,
      deliveryAddress,
    });

    // Deduct credit in Supabase
    await supabase.from('users').update({ credit_balance: user.creditBalance - total }).eq('id', user.id);

    // Log purchase transaction (non-critical)
    supabase.from('transactions').insert({
      user_id: user.id,
      user_email: user.email,
      amount: total,
      type: 'purchase',
      notes: `Order #${orderId}`,
      status: 'completed'
    }).then(({ error: txErr }) => { if (txErr) console.warn('Transaction log failed:', txErr.message); });

    // Mirror to local DB for dashboard display on same device
    DB.addOrder({
      id: orderId,
      userId: user.id,
      name: user.name, surname: user.surname, email: user.email,
      items: cart.map(c => ({ productId: c.productId, quantity: c.qty })),
      subtotal, deliveryFee: delivFee, total, deliveryMethod, deliveryAddress,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    clearCart();
    closeCart();
    showToast('🎉 Order placed! Order ID: ' + orderId, 'success', 5000);
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

  // Initialize data (don't block the rest of UI with await)
  loadProductsFromAPI();

  // URL filter param
  const params = new URLSearchParams(window.location.search);
  const filterParam = params.get('filter');
  if (filterParam) {
    activeFilter = filterParam;
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === filterParam);
    });
  }

  renderProducts();
  updateCartUI();

  // Credit banner & Points
  if (Auth.isLoggedIn()) {
    const user = Auth.getCurrentUser();
    const pointsBtn = document.getElementById('use-points-btn');
    if (pointsBtn && user.points > 10) {
      pointsBtn.style.display = 'block';
      pointsBtn.title = `You have ${user.points} points worth ${formatCurrency(user.points / 10)}`;
    }

    const creditBanner = document.getElementById('credit-banner');
    if (creditBanner) {
      creditBanner.classList.remove('hidden');
      document.getElementById('banner-balance').textContent = formatCurrency(user.creditBalance);
      document.getElementById('banner-ref').textContent = user.refNumber;
    }
    
    const accInfo = document.getElementById('sidebar-account-info');
    const accLogged = document.getElementById('sidebar-account-loggedin');
    if (accInfo) accInfo.style.display = 'none';
    if (accLogged) {
      accLogged.style.display = 'block';
      document.getElementById('sidebar-balance').textContent = formatCurrency(user.creditBalance);
      document.getElementById('sidebar-ref-display').textContent = 'REF: ' + user.refNumber;
    }

    if (user.coordinates) {
      const fee = calcDeliveryFee(user.coordinates);
      const feeLabel = document.getElementById('delivery-fee-label');
      if (feeLabel) feeLabel.textContent = fee === 0 ? 'Free for you!' : `~R${fee.toFixed(2)} for you`;
    }
  }

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

  // Listen for location selection from location picker
  window.addEventListener('locationSelected', (e) => {
    const { address, lat, lng } = e.detail;
    const input = document.getElementById('delivery-addr-input');
    const distanceTag = document.getElementById('delivery-distance-tag');
    if (input) input.value = address;
    setDeliveryCoords({ lat, lng }, distanceTag);
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
