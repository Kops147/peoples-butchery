/* ── Pretoria Suburbs Database with Coordinates ── */
/* Accurate hardcoded coordinates for 20km radius from butchery */
/* Store location: -25.7219, 28.3412 (East Lynne) */

const SUBURBS_DB = {
  'east lynne': { lat: -25.7219, lng: 28.3412, km: 0 },
  'lindopark': { lat: -25.7150, lng: 28.3480, km: 0.6 },
  'silverton': { lat: -25.7333, lng: 28.3000, km: 5.2 },
  'mamelodi': { lat: -25.5900, lng: 28.3200, km: 15.8 },
  'pretoria central': { lat: -25.7414, lng: 28.2302, km: 7.5 },
  'pretoria east': { lat: -25.7500, lng: 28.3800, km: 4.2 },
  'pretoria north': { lat: -25.6800, lng: 28.2500, km: 9.3 },
  'pretoria west': { lat: -25.7600, lng: 28.1800, km: 12.1 },
  'pretoria gardens': { lat: -25.7200, lng: 28.2800, km: 5.1 },
  'arcadia': { lat: -25.7550, lng: 28.2350, km: 8.2 },
  'brooklyn': { lat: -25.7450, lng: 28.1950, km: 11.4 },
  'hatfield': { lat: -25.7650, lng: 28.2450, km: 9.8 },
  'lynnwood': { lat: -25.8100, lng: 28.2800, km: 12.5 },
  'menlyn': { lat: -25.7700, lng: 28.3650, km: 6.8 },
  'moreleta park': { lat: -25.8200, lng: 28.3500, km: 13.2 },
  'waterkloof': { lat: -25.8350, lng: 28.1800, km: 16.9 },
  'groenkloof': { lat: -25.7300, lng: 28.2000, km: 10.2 },
  'faerie glen': { lat: -25.8650, lng: 28.3200, km: 15.1 },
  'constantia park': { lat: -25.8500, lng: 28.2900, km: 14.8 },
  'wierda park': { lat: -25.7900, lng: 28.2500, km: 11.6 },
  'centurion': { lat: -25.8900, lng: 28.1700, km: 18.3 },
  'midrand': { lat: -25.6800, lng: 28.1200, km: 14.7 },
  'sunnyside': { lat: -25.7350, lng: 28.2650, km: 6.9 },
  'gezina': { lat: -25.6950, lng: 28.1750, km: 11.8 },
  'queenswood': { lat: -25.7050, lng: 28.0950, km: 14.2 },
  'rietfontein': { lat: -25.7100, lng: 28.4100, km: 7.1 },
  'wonderboom': { lat: -25.6600, lng: 28.3000, km: 9.4 },
  'annlin': { lat: -25.6450, lng: 28.2350, km: 10.6 },
  'doornpoort': { lat: -25.6200, lng: 28.2800, km: 12.3 },
  'montana': { lat: -25.5800, lng: 28.2650, km: 14.1 },
  'zambezi': { lat: -25.6100, lng: 28.2200, km: 11.9 },
  'sinoville': { lat: -25.5650, lng: 28.3350, km: 13.8 },
  'kameeldrift': { lat: -25.6400, lng: 28.1500, km: 13.7 },
  'roodeplaat': { lat: -25.5200, lng: 28.3900, km: 16.2 },
  'cullinan': { lat: -25.5000, lng: 28.2500, km: 15.9 },
  'rayton': { lat: -25.4800, lng: 28.3200, km: 16.4 },
  'bapsfontein': { lat: -25.5950, lng: 28.5200, km: 16.8 },
  'bronkhorstspruit': { lat: -25.6700, lng: 28.6200, km: 17.5 },
  'eersterust': { lat: -25.5650, lng: 28.1850, km: 13.2 },
};

function getSuburbCoords(suburb) {
  if (!suburb) return null;
  const key = suburb.toLowerCase().trim();
  return SUBURBS_DB[key] || null;
}

function calcDeliveryFeeBySuburb(suburb) {
  const coords = getSuburbCoords(suburb);
  if (!coords) return null;
  const km = coords.km;
  const FLAT_FEE = 15;
  const MIN_KM = 3;
  const RATE_PER_KM = 5;
  if (km <= MIN_KM) return FLAT_FEE;
  return FLAT_FEE + (Math.ceil(km - MIN_KM) * RATE_PER_KM);
}

function getAllSuburbs() {
  return Object.keys(SUBURBS_DB)
    .map(k => k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    .sort();
}

function filterSuburbs(prefix) {
  if (!prefix) return getAllSuburbs();
  const q = prefix.toLowerCase().trim();
  return getAllSuburbs().filter(s => s.toLowerCase().startsWith(q));
}

window.SUBURBS_DB = SUBURBS_DB;
window.getSuburbCoords = getSuburbCoords;
window.calcDeliveryFeeBySuburb = calcDeliveryFeeBySuburb;
window.getAllSuburbs = getAllSuburbs;
window.filterSuburbs = filterSuburbs;
