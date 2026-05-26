/* =============================================
   The Peoples Butchery — New Cart Module (cartNew.js)
   ============================================= */

'use strict';

import { supabase } from './supabase-config.js';
import { saveOrderToSupabase } from './supabase-orders.js';
import { LOCAL_CATALOG, mapToProduct } from './catalog.js';

// ── State ──────────────────────────────────────
let cart = [];
let allProducts = [];
let fulfillment = 'delivery';
let deliveryCoords = null;
let deliveryAddress = '';
let deliveryFee = 0;

// ── Initialization ─────────────────────────────
async function init() {
  loadCart();
  await loadProducts();
  renderCart();
  updateSummary();
  checkAuth();
}

function loadCart() {
  try {
    cart = JSON.parse(sessionStorage.getItem('nilos_cart')) || [];
  } catch {
    cart = [];
  }
}

async function loadProducts() {
  // Use LOCAL_CATALOG as baseline
  allProducts = LOCAL_CATALOG.map(mapToProduct);

  // Try to supplement with Supabase
  try {
    const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
    if (!error && data && data.length > 0) {
      const supabaseProducts = data.map(p => ({
        ...mapToProduct({
          stock_code: String(p.id),
          name: p.name,
          price: p.price,
          unit: p.unit,
          category: p.category_label || p.category,
          image: p.image || p.image_url
        }),
        description: p.description
      }));
      // Merge or prefer Supabase
      supabaseProducts.forEach(sp => {
        const idx = allProducts.findIndex(ap => ap.id === sp.id);
        if (idx !== -1) allProducts[idx] = sp;
        else allProducts.push(sp);
      });
    }
  } catch (err) {
    console.warn('Could not fetch products from Supabase for cart:', err);
  }
}

// ── Fulfillment Logic ──────────────────────────
window.setFulfillment = (method) => {
  fulfillment = method;
  document.getElementById('opt-delivery').classList.toggle('selected', method === 'delivery');
  document.getElementById('opt-collect').classList.toggle('selected', method === 'collect');
  
  document.getElementById('delivery-details').style.display = method === 'delivery' ? 'block' : 'none';
  document.getElementById('collection-details').style.display = method === 'collect' ? 'block' : 'none';
  document.getElementById('row-delivery').style.display = method === 'delivery' ? 'flex' : 'none';
  
  updateSummary();
};

window.addEventListener('locationSelected', (e) => {
  const { address, lat, lng } = e.detail;
  deliveryAddress = address;
  deliveryCoords = { lat, lng };
  
  // Use global calculation utilities from app.js
  const km = typeof haversineKm === 'function' ? haversineKm(STORE_COORDS, deliveryCoords) : 0;
  deliveryFee = typeof calcDeliveryFee === 'function' ? calcDeliveryFee(deliveryCoords) : 15;
  
  document.getElementById('addr-text').textContent = address;
  document.getElementById('dist-text').textContent = `📍 ${km.toFixed(1)} km away · Delivery fee: ${typeof formatCurrency === 'function' ? formatCurrency(deliveryFee) : 'R' + deliveryFee}`;
  
  updateSummary();
});

// ── Rendering ──────────────────────────────────
function renderCart() {
  const container = document.getElementById('cart-items-list');
  const emptyMsg = document.getElementById('cart-empty-msg');
  const fulfillmentSec = document.getElementById('fulfillment-section');
  
  if (cart.length === 0) {
    container.innerHTML = '';
    emptyMsg.style.display = 'block';
    fulfillmentSec.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  fulfillmentSec.style.display = 'block';

  container.innerHTML = cart.map(item => {
    const p = allProducts.find(prod => prod.id === item.productId);
    if (!p) return '';

    const lineTotal = p.price * item.qty;
    const isWeight = /kg/i.test(p.unit || '');

    return `
      <div class="cart-item">
        <img src="${p.image}" alt="${p.name}" class="cart-item-img" onerror="this.src='assets/img/food/meat_on_braai.jpg'">
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-meta">${item.qty} ${isWeight ? 'kg' : 'each'} × ${formatCurrency(p.price)}</div>
          <div class="cart-item-actions">
            <div class="cart-item-price">${formatCurrency(lineTotal)}</div>
            <button class="btn btn-ghost btn-sm" onclick="window.removeItem('${item.productId}')" style="color:var(--error);">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateSummary() {
  const subtotal = cart.reduce((sum, item) => {
    const p = allProducts.find(prod => prod.id === item.productId);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);

  const total = subtotal + (fulfillment === 'delivery' ? deliveryFee : 0);

  document.getElementById('summary-subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('summary-delivery').textContent = formatCurrency(fulfillment === 'delivery' ? deliveryFee : 0);
  document.getElementById('summary-total').textContent = formatCurrency(total);
  
  validateCheckout(total);
}

function validateCheckout(total) {
  const btn = document.getElementById('checkout-btn');
  const balanceWarning = document.getElementById('balance-warning');
  const authWarning = document.getElementById('auth-warning');
  
  if (!Auth.isLoggedIn()) {
    btn.disabled = true;
    authWarning.style.display = 'block';
    balanceWarning.style.display = 'none';
    return;
  }
  
  authWarning.style.display = 'none';
  const user = Auth.getCurrentUser();
  const balance = parseFloat(user.credit_balance || user.creditBalance || 0);
  
  if (balance < total) {
    btn.disabled = true;
    balanceWarning.style.display = 'block';
    document.getElementById('current-balance').textContent = formatCurrency(balance);
  } else {
    btn.disabled = false;
    balanceWarning.style.display = 'none';
  }
}

// ── Actions ────────────────────────────────────
window.removeItem = (id) => {
  cart = cart.filter(item => item.productId !== id);
  sessionStorage.setItem('nilos_cart', JSON.stringify(cart));
  renderCart();
  updateSummary();
};

window.processCheckout = async () => {
  if (!Auth.isLoggedIn()) return;
  if (cart.length === 0) return;
  
  if (fulfillment === 'delivery' && !deliveryCoords) {
    if (typeof showToast === 'function') showToast('Please select a delivery address', 'warning');
    return;
  }

  const user = Auth.getCurrentUser();
  const subtotal = cart.reduce((sum, item) => {
    const p = allProducts.find(prod => prod.id === item.productId);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
  const total = subtotal + (fulfillment === 'delivery' ? deliveryFee : 0);

  const btn = document.getElementById('checkout-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const finalAddress = fulfillment === 'delivery' ? deliveryAddress : 'Collection at Store';
    
    // 1. Create Order in Supabase
    const orderId = await saveOrderToSupabase({
      userId: user.id,
      userEmail: user.email,
      items: cart.map(c => ({ productId: c.productId, quantity: c.qty })),
      subtotal,
      deliveryFee: (fulfillment === 'delivery' ? deliveryFee : 0),
      total,
      deliveryMethod: fulfillment,
      deliveryAddress: finalAddress,
    });

    // 2. Deduct Credit
    const currentBalance = parseFloat(user.credit_balance || user.creditBalance || 0);
    const { error: updateError } = await supabase
      .from('users')
      .update({ credit_balance: currentBalance - total })
      .eq('id', user.id);
    
    if (updateError) throw updateError;

    // 3. Clear Cart
    sessionStorage.removeItem('nilos_cart');
    
    if (typeof showToast === 'function') showToast('Order placed successfully!', 'success');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 2000);

  } catch (err) {
    console.error('Checkout failed:', err);
    if (typeof showToast === 'function') showToast('Checkout failed: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
};

function checkAuth() {
  if (!Auth.isLoggedIn()) {
    document.getElementById('auth-warning').style.display = 'block';
  }
}

// Start
init();
