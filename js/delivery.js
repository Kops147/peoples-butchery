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

async function geocodePhoton(address) {
  try {
    const q = encodeURIComponent(`${address}, Pretoria`);
    const url = `https://photon.komoot.io/api/?q=${q}&lat=${STORE_COORDS.lat}&lon=${STORE_COORDS.lng}&limit=5&lang=en&bbox=27.8,-25.9,28.7,-25.5`;
    const res = await fetch(url);
    const data = await res.json();
    const hit = (data.features || []).find((f) => {
      const [lng, lat] = f.geometry.coordinates;
      return lng >= 27.8 && lng <= 28.7 && lat >= -25.9 && lat <= -25.5;
    });
    if (!hit) return null;
    const [lng, lat] = hit.geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function geocodeAddress(address) {
  if (!address || !String(address).trim()) return null;
  const photon = await geocodePhoton(address);
  if (photon) return photon;
  try {
    const q = encodeURIComponent(address + ', Pretoria, South Africa');
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
