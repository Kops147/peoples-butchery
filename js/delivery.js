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
  
  // Try suburb-based calculation first (accurate, hardcoded)
  if (window.calcDeliveryFeeBySuburb && customerCoords.suburb) {
    const fee = window.calcDeliveryFeeBySuburb(customerCoords.suburb);
    if (fee !== null) return fee;
  }
  
  // Fallback: use haversine for unknown addresses
  const km = haversineKm(STORE_COORDS, customerCoords);
  // <3km: R5 flat | >3km: R4.95/km
  if (km < 3) return 5;
  return Math.round(km * 4.95 * 100) / 100;
}

function formatDeliveryFee(fee) {
  if (fee === null) return 'Calculating...';
  if (fee === 0) return 'FREE';
  return `R${fee.toFixed(2)}`;
}

function isAddressResult(f) {
  const p = f.properties || {};
  const key = p.osm_key || '';
  const val = p.osm_value || '';
  const ptype = p.type || '';
  if (ptype === 'postcode' || val === 'postcode') return false;
  if (ptype === 'municipality' || val === 'municipality') return false;
  if (ptype === 'administrative') return false;
  if (key === 'highway') return true;
  if (key === 'place' && val === 'house') return true;
  if (key === 'place' && (val === 'suburb' || val === 'neighbourhood' || val === 'town')) return true;
  if (key === 'amenity' || key === 'shop' || key === 'office' || key === 'building') return true;
  if (p.street) return true;
  if (val === 'postal_code' || val === 'administrative') return false;
  return !!(p.name);
}

async function geocodePhoton(address, suburb) {
  try {
    const ctx = suburb ? `${address}, ${suburb}, Pretoria` : `${address}, Pretoria`;
    const q = encodeURIComponent(ctx);
    const url = `https://photon.komoot.io/api/?q=${q}&lat=${STORE_COORDS.lat}&lon=${STORE_COORDS.lng}&limit=8&lang=en&bbox=27.8,-25.9,28.7,-25.5`;
    const res = await fetch(url);
    const data = await res.json();
    const features = (data.features || []).filter(f => {
      const [lng, lat] = f.geometry.coordinates;
      return lng >= 27.8 && lng <= 28.7 && lat >= -25.9 && lat <= -25.5 && isAddressResult(f);
    });
    // Prefer a house/street result, fallback to any valid result
    const hit = features.find(f => f.properties.osm_key === 'highway' || f.properties.osm_value === 'house')
      || features[0];
    if (!hit) return null;
    const [lng, lat] = hit.geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function geocodeAddress(address, suburb) {
  if (!address || !String(address).trim()) return null;
  const photon = await geocodePhoton(address, suburb);
  if (photon) return photon;
  try {
    const ctx = suburb ? `${address}, ${suburb}, Pretoria, South Africa` : `${address}, Pretoria, South Africa`;
    const q = encodeURIComponent(ctx);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3&addressdetails=1`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'ThePeoplesButchery/1.0' }
    });
    const data = await res.json();
    const inPretoria = data.find((row) => {
      const lat = parseFloat(row.lat);
      const lng = parseFloat(row.lon);
      return lng >= 27.8 && lng <= 28.7 && lat >= -25.9 && lat <= -25.5;
    }) || data[0];
    if (inPretoria) {
      return { lat: parseFloat(inPretoria.lat), lng: parseFloat(inPretoria.lon) };
    }
    return null;
  } catch {
    return null;
  }
}
