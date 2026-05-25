/* =============================================
   The Peoples Butchery — Admin Products CRUD
   Standalone module for managing products.
   ============================================= */

import { supabase } from './supabase-config.js';
import { LOCAL_CATALOG, mapToProduct } from './catalog.js';

let _products = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check Auth
    const session = JSON.parse(localStorage.getItem('nilos_session'));
    if (!session || !session.isAdmin) {
      window.location.href = 'login.html';
      return;
    }

    document.getElementById('admin-name').textContent = session.name || 'Admin';
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      localStorage.removeItem('nilos_session');
      localStorage.removeItem('nilos_token');
      window.location.href = 'login.html';
    });

    await loadProducts();
    initProductForm();
    setupMobileSidebar();
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Failed to initialize: ' + error.message, 'error');
  }
});

async function loadProducts() {
  const container = document.getElementById('admin-products-list');
  if (container) container.innerHTML = '<div style="text-align:center;padding:40px">Searching for products...</div>';

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      _products = data;
    } else {
      console.warn('No products in Supabase, loading from local catalog');
      _products = LOCAL_CATALOG.map(mapToProduct);
    }
    renderProducts();
  } catch (err) {
    console.error('Error loading products:', err);
    showToast('Database error: ' + err.message, 'error');
    _products = LOCAL_CATALOG.map(mapToProduct);
    renderProducts();
  }
}

function renderProducts() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;

  if (_products.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px">No products found.</div>';
    return;
  }

  container.innerHTML = _products.map(p => {
    const isActive = p.is_active !== false;
    const price = parseFloat(p.price || 0);
    const image = p.image_url || p.image || 'assets/img/food/meat_on_braai.jpg';

    return `
    <div class="product-admin-card mb-4" id="prod-admin-${p.id}">
      <div class="product-admin-img">
        <img src="${image}" alt="${p.name}" onerror="this.src='assets/img/food/meat_on_braai.jpg'">
      </div>
      <div class="product-admin-info">
        <div style="font-family:var(--font-head);font-weight:700;font-size:1.1rem">${p.name}</div>
        <div style="font-size:0.85rem;color:var(--text-secondary);margin:4px 0">${p.description || 'No description'}</div>
        <div style="display:flex;gap:12px;align-items:center;margin-top:8px;flex-wrap:wrap">
          <span class="text-gold font-bold" style="font-size:1.1rem">R${price.toFixed(2)} <span style="font-weight:400;color:var(--text-muted);font-size:0.8rem">${p.unit || ''}</span></span>
          <span class="badge ${p.category === 'raw' ? 'badge-red' : 'badge-gold'}">${p.category === 'raw' ? '🥩 Raw' : '🍽️ Cooked'}</span>
          <span class="badge ${isActive ? 'badge-green' : 'badge-gray'}">${isActive ? '✅ Available' : '❌ Hidden'}</span>
        </div>
      </div>
      <div class="product-admin-actions">
        <button class="btn btn-outline btn-sm" onclick="window.editProduct('${p.id}')">✏️ Edit</button>
        <button class="btn ${isActive ? 'btn-outline' : 'btn-success'} btn-sm" onclick="window.toggleAvailability('${p.id}')">
          ${isActive ? '⛔ Hide' : '✅ Show'}
        </button>
        <button class="btn btn-danger btn-sm" onclick="window.deleteProduct('${p.id}')">🗑️ Delete</button>
      </div>
    </div>`;
  }).join('');
}

// Global window functions for inline onclick handlers
window.toggleAvailability = async (id) => {
  const p = _products.find(item => item.id == id);
  if (!p) return;

  const newState = !(p.is_active !== false);
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: newState })
      .eq('id', id);

    if (error) throw error;

    p.is_active = newState;
    renderProducts();
    showToast(`${p.name} is now ${newState ? 'visible' : 'hidden'}`, 'success');
  } catch (err) {
    showToast('Failed to update: ' + err.message, 'error');
  }
};

window.deleteProduct = async (id) => {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    _products = _products.filter(item => item.id != id);
    renderProducts();
    showToast('Product deleted', 'warning');
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
};

window.editProduct = (id) => {
  const p = _products.find(item => item.id == id);
  if (!p) return;

  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-category').value = p.category || 'raw';
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-unit').value = p.unit || '';
  document.getElementById('prod-desc').value = p.description || '';
  document.getElementById('prod-image').value = p.image_url || p.image || '';
  document.getElementById('prod-is-special').checked = p.is_special || false;
  document.getElementById('prod-discount').value = p.discount_price || '';

  const preview = document.getElementById('prod-image-preview');
  if (preview) {
    const imgUrl = p.image_url || p.image;
    if (imgUrl) {
      preview.src = imgUrl;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  }

  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('product-modal').classList.add('open');
};

function initProductForm() {
  const form = document.getElementById('product-form');
  const modal = document.getElementById('product-modal');

  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    form.reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-image').value = '';
    document.getElementById('prod-image-preview').style.display = 'none';
    document.getElementById('product-modal-title').textContent = 'Add New Product';
    modal.classList.add('open');
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => modal.classList.remove('open'));
  });

  document.getElementById('upload-image-btn')?.addEventListener('click', () => {
    document.getElementById('prod-image-file').click();
  });

  document.getElementById('prod-image-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      document.getElementById('prod-image').value = base64;
      const preview = document.getElementById('prod-image-preview');
      if (preview) {
        preview.src = base64;
        preview.style.display = 'block';
      }
      document.getElementById('upload-status').textContent = '✅ Image ready';
    };
    reader.readAsDataURL(file);
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const productData = {
      name: document.getElementById('prod-name').value,
      category: document.getElementById('prod-category').value,
      price: parseFloat(document.getElementById('prod-price').value),
      unit: document.getElementById('prod-unit').value,
      description: document.getElementById('prod-desc').value,
      image: document.getElementById('prod-image').value,
      is_special: document.getElementById('prod-is-special').checked,
      discount_price: document.getElementById('prod-discount').value ? parseFloat(document.getElementById('prod-discount').value) : null,
      updated_at: new Date().toISOString()
    };

    try {
      if (id) {
        // Update
        const { error } = await supabase.from('products').update(productData).eq('id', id);
        if (error) throw error;
        showToast('Product updated!', 'success');
      } else {
        // Create
        productData.created_at = new Date().toISOString();
        productData.is_active = true;
        const { error } = await supabase.from('products').insert([productData]);
        if (error) throw error;
        showToast('Product added!', 'success');
      }
      modal.classList.remove('open');
      await loadProducts();
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  });
}

function setupMobileSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
    overlay?.classList.add('open');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('open');
  });
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
