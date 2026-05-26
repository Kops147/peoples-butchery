/* =============================================
   The Peoples Butchery — New Shop Module (shopNew.js)
   Robust version with enhanced logging
   ============================================= */

'use strict';

import { supabase } from './supabase-config.js';
import { LOCAL_CATALOG, mapToProduct } from './catalog.js';

// ── State ──────────────────────────────────────
let cart = [];
let apiProducts = [];
let activeFilter = 'all';
let searchQuery = '';

// ── Product Helpers ────────────────────────────
function findProduct(id) {
  return apiProducts.find(p => p.id === String(id));
}

/**
 * Universal Mapping Logic
 * Ensures products from any source (Local/Supabase) match the UI needs.
 */
function normalizeProduct(p) {
  try {
    // 1. Identify category (raw vs cooked)
    // We look at the category string and force it into our UI's expected types.
    const rawCat = (p.category_label || p.category || '').toLowerCase();
    const isCooked = /cooked|meal|side|other|plate/i.test(rawCat) || /meal/i.test(p.name || '');
    const category = isCooked ? 'cooked' : 'raw';
    
    // 2. Fallback Image
    const image = p.image || p.image_url || 'assets/img/food/meat_on_braai.jpg';

    return {
      id: String(p.id || p.stock_code || (p.name ? p.name.replace(/\s+/g, '-').toLowerCase() : Math.random())),
      name: p.name || 'Unnamed Product',
      category: category,
      categoryLabel: p.category_label || p.category || (isCooked ? 'Meal' : 'Meat'),
      description: p.description || '',
      price: parseFloat(p.price) || 0,
      unit: p.unit || 'per kg',
      image: image,
      available: p.is_active !== false && p.available !== false // Default to true unless explicitly false
    };
  } catch (err) {
    console.error('Failed to normalize product:', p, err);
    return null;
  }
}

async function loadProducts() {
  console.log('🏁 Starting product load...');
  
  // 1. Load from local catalog immediately to ensure the user sees SOMETHING
  try {
    if (Array.isArray(LOCAL_CATALOG)) {
      apiProducts = LOCAL_CATALOG.map(normalizeProduct).filter(Boolean);
      console.log('✅ Local catalog loaded:', apiProducts.length, 'items');
      renderProducts();
    } else {
      console.warn('⚠️ LOCAL_CATALOG is not an array or missing.');
    }
  } catch (err) {
    console.error('❌ Error loading local catalog:', err);
  }

  // 2. Fetch fresh data from Supabase
  try {
    console.log('📡 Fetching from Supabase...');
    const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
    
    if (error) {
      console.warn('⚠️ Supabase returned an error:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Supabase data received:', data.length, 'items');
      
      const mapped = data.map(normalizeProduct).filter(Boolean);
      
      // If we got fresh data, we prefer it over the local one.
      // We merge them by ID, preferring Supabase versions.
      const freshProducts = [...mapped];
      apiProducts.forEach(localP => {
        if (!freshProducts.find(fp => fp.id === localP.id)) {
          freshProducts.push(localP);
        }
      });
      
      apiProducts = freshProducts;
      console.log('📦 Total merged products:', apiProducts.length);
      renderProducts();
    } else {
      console.log('ℹ️ No active products found in Supabase.');
    }
  } catch (err) {
    console.warn('⚠️ Supabase fetch failed (network or config):', err.message);
  }
}

// ── Cart Management ────────────────────────────
function loadCart() {
  try {
    cart = JSON.parse(sessionStorage.getItem('nilos_cart')) || [];
    console.log('🛒 Cart loaded from session:', cart.length, 'items');
  } catch {
    cart = [];
  }
  updateCartBadge();
}

function saveCart() {
  sessionStorage.setItem('nilos_cart', JSON.stringify(cart));
  updateCartBadge();
  renderProducts(); // Re-render to update "In Cart" vs "Add to Cart" states
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge-count');
  if (badge) {
    badge.textContent = cart.length;
    badge.style.display = cart.length > 0 ? 'flex' : 'none';
  }
}

function addToCart(productId, qty = 1) {
  const product = findProduct(productId);
  if (!product) return;

  const existing = cart.find(c => c.productId === productId);
  if (existing) {
    existing.qty = parseFloat((existing.qty + qty).toFixed(3));
  } else {
    cart.push({ productId, qty });
  }
  
  saveCart();
  if (typeof showToast === 'function') {
    showToast(`${product.name} added to cart!`, 'success');
  }
}

function removeFromCart(productId) {
  cart = cart.filter(c => c.productId !== productId);
  saveCart();
}

// ── Rendering ──────────────────────────────────
function renderProducts() {
  const container = document.getElementById('products-grid');
  if (!container) {
    console.error('❌ Could not find #products-grid in the DOM.');
    return;
  }

  const filtered = apiProducts.filter(p => {
    const matchesFilter = activeFilter === 'all' || p.category === activeFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch && p.available;
  });

  console.log(`🖼️ Rendering ${filtered.length} products (Filter: ${activeFilter}, Search: "${searchQuery}")`);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 48px;">
        <div style="font-size: 3rem; margin-bottom: 16px;">🥩</div>
        <h3>No products found</h3>
        <p style="color: var(--text-muted);">Try a different search or filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const inCart = cart.find(c => c.productId === p.id);
    const weighted = /kg/i.test(p.unit || '');
    const each = /each/i.test(p.unit || '');
    
    const catBadge = p.category === 'cooked'
      ? '<span class="badge badge-gold">🍽️ Cooked Meal</span>'
      : `<span class="badge badge-red">🥩 ${p.categoryLabel || 'Meat'}</span>`;

    let cartControl;
    if (weighted) {
      const currentKg = inCart ? inCart.qty : 0.5;
      const currentRand = (currentKg * p.price).toFixed(2);
      cartControl = `
        <div class="weight-dual-row">
          <div class="weight-field">
            <input type="number" class="weight-inp" id="wi-${p.id}" value="${currentKg}" min="0.25" step="0.25" oninput="window.syncWeights('${p.id}', 'kg')">
            <span class="weight-lbl">kg</span>
          </div>
          <div class="weight-field">
            <span class="weight-lbl">R</span>
            <input type="number" class="weight-inp" id="pi-${p.id}" value="${currentRand}" min="0" step="1" oninput="window.syncWeights('${p.id}', 'price')">
          </div>
        </div>
        <button class="btn-add ${inCart ? 'btn-in-cart' : ''}" onclick="window.handleCartAction('${p.id}', 'weight')">
          ${inCart ? '✓ Update Weight' : 'Add to Cart'}
        </button>
      `;
    } else {
      const currentQty = inCart ? inCart.qty : 1;
      cartControl = `
        <div class="weight-dual-row">
          <div class="weight-field" style="justify-content: center;">
            <button class="pap-btn" onclick="window.adjustQty('${p.id}', -1)">−</button>
            <input type="number" class="weight-inp" id="qi-${p.id}" value="${currentQty}" min="1" readonly style="width: 40px;">
            <button class="pap-btn" onclick="window.adjustQty('${p.id}', 1)">+</button>
            <span class="weight-lbl" style="margin-left: 8px;">${each ? 'each' : p.unit}</span>
          </div>
        </div>
        <button class="btn-add ${inCart ? 'btn-in-cart' : ''}" onclick="window.handleCartAction('${p.id}', 'qty')">
          ${inCart ? '✓ In Cart' : 'Add to Cart'}
        </button>
      `;
    }

    return `
      <div class="product-card">
        <div class="product-img">
          <img src="${p.image}" alt="${p.name}" onerror="this.src='assets/img/food/meat_on_braai.jpg'">
          <div class="product-category-tag">${catBadge}</div>
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
            <div class="product-price">${typeof formatCurrency === 'function' ? formatCurrency(p.price) : 'R' + p.price.toFixed(2)}</div>
            <div class="product-unit">${p.unit}</div>
          </div>
          <div class="weight-ctrl-wrap">
            ${cartControl}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Window Helpers for Inline Events ───────────
window.syncWeights = (id, source) => {
  const p = findProduct(id);
  if (!p) return;
  const kgInp = document.getElementById(`wi-${id}`);
  const prInp = document.getElementById(`pi-${id}`);
  
  if (source === 'kg') {
    const kg = parseFloat(kgInp.value) || 0;
    prInp.value = (kg * p.price).toFixed(2);
  } else {
    const pr = parseFloat(prInp.value) || 0;
    kgInp.value = (pr / p.price).toFixed(2);
  }
};

window.adjustQty = (id, delta) => {
  const inp = document.getElementById(`qi-${id}`);
  const val = parseInt(inp.value) || 1;
  inp.value = Math.max(1, val + delta);
};

window.handleCartAction = (id, type) => {
  if (type === 'weight') {
    const kg = parseFloat(document.getElementById(`wi-${id}`).value) || 0;
    if (kg < 0.25) {
      if (typeof showToast === 'function') showToast('Minimum 0.25kg required', 'warning');
      return;
    }
    const existing = cart.find(c => c.productId === id);
    if (existing) {
      existing.qty = kg;
      saveCart();
      if (typeof showToast === 'function') showToast('Cart updated', 'success');
    } else {
      addToCart(id, kg);
    }
  } else {
    const qty = parseInt(document.getElementById(`qi-${id}`).value) || 1;
    const existing = cart.find(c => c.productId === id);
    if (existing) {
      removeFromCart(id);
      if (typeof showToast === 'function') showToast('Removed from cart', 'info');
    } else {
      addToCart(id, qty);
    }
  }
};

// ── Initialization ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Shop initialized. Setting up listeners...');
  loadCart();
  loadProducts();

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderProducts();
    });
  });

  // Search
  const searchInput = document.getElementById('product-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderProducts();
    });
  }
});
