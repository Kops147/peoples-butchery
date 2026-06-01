/* ── Pretoria Suburbs Database with Coordinates ── */
/* Accurate hardcoded coordinates for Pretoria area */
/* Store location: 76 Meeu St, East Lynne (Jan Niemand Park) -25.7084818, 28.2855143 */
/* Delivery: <3km R5 flat | >3km R4.95/km */

const SUBURBS_DB = {
  'east lynne': { lat: -25.7084818, lng: 28.2855143, km: 0 },
  'lindopark': { lat: -25.7150, lng: 28.3480, km: 3.8 },
  'eersterust': { lat: -25.7076819, lng: 28.3159252, km: 3.2 },
  'silverton': { lat: -25.7333, lng: 28.3000, km: 4.1 },
  'mamelodi': { lat: -25.5900, lng: 28.3200, km: 13.5 },
  'pretoria central': { lat: -25.7414, lng: 28.2302, km: 6.8 },
  'pretoria east': { lat: -25.7500, lng: 28.3800, km: 5.2 },
  'pretoria north': { lat: -25.6800, lng: 28.2500, km: 8.9 },
  'pretoria west': { lat: -25.7600, lng: 28.1800, km: 10.5 },
  'pretoria gardens': { lat: -25.7200, lng: 28.2800, km: 4.2 },
  'arcadia': { lat: -25.7550, lng: 28.2350, km: 7.1 },
  'brooklyn': { lat: -25.7450, lng: 28.1950, km: 10.2 },
  'hatfield': { lat: -25.7650, lng: 28.2450, km: 8.5 },
  'lynnwood': { lat: -25.8100, lng: 28.2800, km: 11.3 },
  'menlyn': { lat: -25.7700, lng: 28.3650, km: 6.2 },
  'moreleta park': { lat: -25.8200, lng: 28.3500, km: 11.8 },
  'waterkloof': { lat: -25.8350, lng: 28.1800, km: 15.2 },
  'groenkloof': { lat: -25.7300, lng: 28.2000, km: 8.8 },
  'faerie glen': { lat: -25.8650, lng: 28.3200, km: 13.9 },
  'constantia park': { lat: -25.8500, lng: 28.2900, km: 13.5 },
  'wierda park': { lat: -25.7900, lng: 28.2500, km: 10.2 },
  'centurion': { lat: -25.8900, lng: 28.1700, km: 16.8 },
  'midrand': { lat: -25.6800, lng: 28.1200, km: 13.2 },
  'sunnyside': { lat: -25.7350, lng: 28.2650, km: 5.9 },
  'gezina': { lat: -25.6950, lng: 28.1750, km: 10.5 },
  'queenswood': { lat: -25.7050, lng: 28.0950, km: 12.8 },
  'rietfontein': { lat: -25.7100, lng: 28.4100, km: 6.8 },
  'wonderboom': { lat: -25.6600, lng: 28.3000, km: 8.9 },
  'annlin': { lat: -25.6450, lng: 28.2350, km: 9.8 },
  'doornpoort': { lat: -25.6200, lng: 28.2800, km: 11.5 },
  'montana': { lat: -25.5800, lng: 28.2650, km: 12.9 },
  'zambezi': { lat: -25.6100, lng: 28.2200, km: 10.8 },
  'sinoville': { lat: -25.5650, lng: 28.3350, km: 12.5 },
  'kameeldrift': { lat: -25.6400, lng: 28.1500, km: 12.3 },
  'roodeplaat': { lat: -25.5200, lng: 28.3900, km: 14.9 },
  'cullinan': { lat: -25.5000, lng: 28.2500, km: 14.8 },
  'rayton': { lat: -25.4800, lng: 28.3200, km: 15.2 },
  'bapsfontein': { lat: -25.5950, lng: 28.5200, km: 16.1 },
  'bronkhorstspruit': { lat: -25.6700, lng: 28.6200, km: 17.0 },
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
  // <3km: R5 flat | >3km: R4.95/km
  if (km < 3) return 5;
  return Math.round(km * 4.95 * 100) / 100;
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
