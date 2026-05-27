/* ── Google Maps + Photon fallback (delivery from butchery) ── */

let googleMap;
let googleMarker;
let googleAutocomplete;
let selectedLocation = null;
let mapModalCallback = null;
let mapsLoadFailed = false;

const PRETORIA_BBOX = '27.8,-25.9,28.7,-25.5';
const DEFAULT_CENTER = { lat: -25.7219, lng: 28.3412 };

window.gm_authFailure = function () {
  mapsLoadFailed = true;
  console.warn('Google Maps authentication failed — using address search fallback.');
};

function mapsReady() {
  return !!(window.google && window.google.maps && !mapsLoadFailed);
}

export async function initGoogleMaps() {
  if (mapsReady()) return;

  const key = window.GOOGLE_MAPS_API_KEY;
  if (!key || key.length < 20) {
    mapsLoadFailed = true;
    return;
  }

  return new Promise((resolve) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    window.onGoogleMapsLoaded = () => {
      if (window.google && window.google.maps) mapsLoadFailed = false;
      resolve();
    };

    const existing = document.querySelector('script[data-google-maps]');
    if (existing) {
      setTimeout(resolve, 800);
      return;
    }

    const script = document.createElement('script');
    script.dataset.googleMaps = '1';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=onGoogleMapsLoaded`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      mapsLoadFailed = true;
      resolve();
    };
    document.head.appendChild(script);

    setTimeout(() => {
      if (!mapsReady()) mapsLoadFailed = true;
      resolve();
    }, 6000);
  });
}

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

function showFallbackPicker(overlay) {
  const canvas = document.getElementById('map-canvas');
  if (canvas) {
    canvas.style.display = 'none';
    canvas.innerHTML = '';
  }

  let panel = document.getElementById('map-fallback-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'map-fallback-panel';
    panel.style.cssText = 'flex:1;padding:16px 24px;overflow:auto;background:var(--bg-base)';
    panel.innerHTML = `
      <p style="margin:0 0 12px;font-size:0.88rem;color:var(--warning)">
        Google Maps is unavailable right now. Search your address below — delivery fee still works.
      </p>
      <div id="map-fallback-results" class="delivery-suggestions" style="position:static;max-height:280px;margin-top:8px"></div>
    `;
    const footer = overlay.querySelector('.map-modal-footer');
    if (footer) overlay.querySelector('.map-modal').insertBefore(panel, footer);
    else overlay.querySelector('.map-modal')?.appendChild(panel);
  } else {
    panel.style.display = 'block';
  }

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

function hideFallbackPanel() {
  const panel = document.getElementById('map-fallback-panel');
  if (panel) panel.style.display = 'none';
  const canvas = document.getElementById('map-canvas');
  if (canvas) canvas.style.display = '';
}

function initGoogleMapUI() {
  const mapCanvas = document.getElementById('map-canvas');
  if (!mapCanvas) return false;

  hideFallbackPanel();
  mapCanvas.style.display = '';
  mapCanvas.style.minHeight = '320px';

  const mapCenter = selectedLocation
    ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
    : DEFAULT_CENTER;

  if (!googleMap) {
    googleMap = new google.maps.Map(mapCanvas, {
      zoom: 14,
      center: mapCenter,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    googleMarker = new google.maps.Marker({
      position: mapCenter,
      map: googleMap,
      draggable: true
    });

    googleMarker.addListener('dragend', () => {
      const pos = googleMarker.getPosition();
      updateLocationFromCoords(pos.lat(), pos.lng());
    });

    googleMap.addListener('click', (e) => {
      googleMarker.setPosition(e.latLng);
      updateLocationFromCoords(e.latLng.lat(), e.latLng.lng());
    });

    const input = document.getElementById('map-search-input');
    if (input) {
      googleAutocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'za' },
        fields: ['address_components', 'geometry', 'formatted_address'],
        bounds: new google.maps.LatLngBounds(
          { lat: -25.9, lng: 27.8 },
          { lat: -25.5, lng: 28.7 }
        )
      });

      googleAutocomplete.addListener('place_changed', () => {
        const place = googleAutocomplete.getPlace();
        if (!place.geometry) return;
        googleMap.setCenter(place.geometry.location);
        googleMap.setZoom(17);
        googleMarker.setPosition(place.geometry.location);
        selectedLocation = {
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
      });
    }
  } else {
    googleMap.setCenter(mapCenter);
    googleMarker.setPosition(mapCenter);
    google.maps.event.trigger(googleMap, 'resize');
  }

  return true;
}

function wireModalActions(overlay) {
  const confirmBtn = document.getElementById('confirm-map-btn');
  const cancelBtn = document.getElementById('cancel-map-btn');

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (selectedLocation && mapModalCallback) {
        mapModalCallback(selectedLocation);
      } else if (typeof showToast === 'function') {
        showToast('Please select an address from the list or map', 'warning');
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

  const tryOpen = async () => {
    if (!mapsReady()) {
      await initGoogleMaps();
    }

    if (mapsReady()) {
      try {
        if (initGoogleMapUI()) return;
      } catch (err) {
        console.warn('Google map init failed:', err);
        mapsLoadFailed = true;
      }
    }

    showFallbackPicker(overlay);
  };

  tryOpen();
}

async function updateLocationFromCoords(lat, lng) {
  if (!mapsReady()) return;
  const geocoder = new google.maps.Geocoder();
  try {
    const response = await geocoder.geocode({ location: { lat, lng } });
    if (response.results[0]) {
      selectedLocation = {
        address: response.results[0].formatted_address,
        lat,
        lng
      };
      const input = document.getElementById('map-search-input');
      if (input) input.value = selectedLocation.address;
    }
  } catch (e) {
    selectedLocation = { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  }
}
