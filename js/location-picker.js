/* ── Open Source Location Picker (Photon API) ──
 * Uses Photon (komoot.io) for address search - no Google Maps required
 * Delivery distance calculated using Haversine formula
 */

let selectedLocation = null;
let mapModalCallback = null;

const PRETORIA_BBOX = '27.8,-25.9,28.7,-25.5';
const DEFAULT_CENTER = { lat: -25.7219, lng: 28.3412 };

async function photonSearch(query) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${DEFAULT_CENTER.lat}&lon=${DEFAULT_CENTER.lng}&limit=6&lang=en&bbox=${PRETORIA_BBOX}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.features || []).filter((f) => {
    const [lng, lat] = f.geometry.coordinates;
    return lng >= 27.8 && lng <= 28.7 && lat >= -25.9 && lat <= -25.5;
  });
}

function labelFromPhotonFeature(f) {
  const p = f.properties || {};
  const street = p.housenumber ? `${p.housenumber} ${p.street || ''}`.trim() : (p.street || '');
  const area = p.suburb || p.district || p.neighbourhood || p.city || '';
  return [street, area, 'Pretoria'].filter(Boolean).join(', ') || p.name || 'Pretoria';
}

function showLocationPicker(overlay) {
  const resultsEl = document.getElementById('map-fallback-results');
  const input = document.getElementById('map-search-input');
  if (!resultsEl || !input) return;

  let timer;
  const runSearch = async () => {
    const q = input.value.trim();
    if (q.length < 3) {
      resultsEl.innerHTML = '';
      return;
    }
    resultsEl.innerHTML = '<div class="delivery-suggestion-item" style="opacity:.6">Searching...</div>';
    try {
      const results = await photonSearch(q);
      resultsEl.innerHTML = '';
      if (!results.length) {
        resultsEl.innerHTML = '<div class="delivery-suggestion-item" style="opacity:.6">No results — try suburb + street</div>';
        return;
      }
      results.forEach((r) => {
        const [lng, lat] = r.geometry.coordinates;
        const address = labelFromPhotonFeature(r);
        const item = document.createElement('div');
        item.className = 'delivery-suggestion-item';
        item.textContent = address;
        item.addEventListener('click', () => {
          selectedLocation = { address, lat, lng };
          input.value = address;
          resultsEl.innerHTML = '';
        });
        resultsEl.appendChild(item);
      });
    } catch {
      resultsEl.innerHTML = '<div class="delivery-suggestion-item" style="opacity:.6">Search failed</div>';
    }
  };

  input.oninput = () => {
    clearTimeout(timer);
    timer = setTimeout(runSearch, 400);
  };
  runSearch();
}

function wireModalActions(overlay) {
  const confirmBtn = document.getElementById('confirm-map-btn');
  const cancelBtn = document.getElementById('cancel-map-btn');

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (selectedLocation && mapModalCallback) {
        mapModalCallback(selectedLocation);
      } else if (typeof showToast === 'function') {
        showToast('Please select an address from the list', 'warning');
        return;
      }
      overlay.classList.remove('open');
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => overlay.classList.remove('open');
  }

  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  };
}

export function openMapModal(callback) {
  mapModalCallback = callback;
  const overlay = document.getElementById('map-modal-overlay');
  if (!overlay) {
    console.error('Map modal overlay not found');
    return;
  }

  overlay.classList.add('open');
  wireModalActions(overlay);
  showLocationPicker(overlay);
}
