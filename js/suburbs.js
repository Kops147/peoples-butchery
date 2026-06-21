/* ── Pretoria Suburbs Database with Coordinates ── */
/* Store location: 76 Meeu St, East Lynne (Jan Niemand Park) -25.7084818, 28.2855143 */
/* Delivery: <3km R5 flat | >3km R4.95/km */
/* Generated from OSM data — all suburbs within 10km radius */

const SUBURBS_DB = {
  'jan niemandpark': { lat: -25.70611, lng: 28.29028, km: 0.5 },  // R5 flat
  'east lynne': { lat: -25.70722, lng: 28.27917, km: 0.7 },  // R5 flat
  'ekklesia': { lat: -25.70085, lng: 28.28658, km: 0.9 },  // R5 flat
  'lindopark': { lat: -25.71347, lng: 28.27708, km: 1.0 },  // R5 flat
  'derdepoortpark': { lat: -25.69736, lng: 28.29361, km: 1.5 },  // R5 flat
  'bergtuin': { lat: -25.69933, lng: 28.27371, km: 1.6 },  // R5 flat
  'silvertondale': { lat: -25.72041, lng: 28.30198, km: 2.1 },  // R5 flat
  'kilner park': { lat: -25.71528, lng: 28.26278, km: 2.4 },  // R5 flat
  'montanapark': { lat: -25.6875, lng: 28.27167, km: 2.7 },  // R5 flat
  'silverton': { lat: -25.72833, lng: 28.30472, km: 2.9 },  // R5 flat
  'waverley': { lat: -25.70193, lng: 28.25557, km: 3.1 },  // R15.28
  'eersterust': { lat: -25.70278, lng: 28.31611, km: 3.1 },  // R15.49
  'weavind park': { lat: -25.73333, lng: 28.27028, km: 3.2 },  // R15.62
  'lydiana': { lat: -25.73889, lng: 28.29111, km: 3.4 },  // R16.97
  'moregloed': { lat: -25.71167, lng: 28.24694, km: 3.9 },  // R19.21
  'brummeria': { lat: -25.74422, lng: 28.28356, km: 4.0 },  // R19.69
  'scientia': { lat: -25.74472, lng: 28.28028, km: 4.1 },  // R20.11
  'persequor': { lat: -25.74389, lng: 28.27389, km: 4.1 },  // R20.32
  'val de grace': { lat: -25.74444, lng: 28.29663, km: 4.2 },  // R20.55
  'navors': { lat: -25.74626, lng: 28.28416, km: 4.2 },  // R20.80
  'la concorde': { lat: -25.73528, lng: 28.31528, km: 4.2 },  // R20.87
  'salieshoek': { lat: -25.73694, lng: 28.31583, km: 4.4 },  // R21.71
  'val-de-grace': { lat: -25.74806, lng: 28.2925, km: 4.5 },  // R22.06
  'queenswood': { lat: -25.73232, lng: 28.24756, km: 4.6 },  // R22.94
  'derdepoort tuindorp': { lat: -25.67389, lng: 28.25722, km: 4.8 },  // R23.65
  'murrayfield': { lat: -25.74694, lng: 28.30778, km: 4.8 },  // R23.87
  'meyerspark': { lat: -25.73944, lng: 28.32, km: 4.9 },  // R24.14
  'la montagne': { lat: -25.745, lng: 28.31611, km: 5.1 },  // R25.18
  'pumulani': { lat: -25.66157, lng: 28.28568, km: 5.2 },  // R25.82
  'colbyn': { lat: -25.73998, lng: 28.24367, km: 5.5 },  // R27.04
  'kameeldrif': { lat: -25.65962, lng: 28.30378, km: 5.7 },  // R28.38
  'magalieskruin': { lat: -25.6875, lng: 28.23222, km: 5.8 },  // R28.85
  'lynnwood manor': { lat: -25.76306, lng: 28.28111, km: 6.1 },  // R30.12
  'lynnwood ridge': { lat: -25.76278, lng: 28.29333, km: 6.1 },  // R30.14
  'montana': { lat: -25.67691, lng: 28.23531, km: 6.1 },  // R30.37
  'rietfontein': { lat: -25.7075, lng: 28.22417, km: 6.1 },  // R30.43
  'lynnwood': { lat: -25.76111, lng: 28.26361, km: 6.2 },  // R30.94
  'hatfield': { lat: -25.75083, lng: 28.24306, km: 6.3 },  // R31.41
  'die wilgers': { lat: -25.76194, lng: 28.31167, km: 6.5 },  // R32.16
  'rietondale': { lat: -25.72917, lng: 28.22444, km: 6.5 },  // R32.36
  'riviera': { lat: -25.7228, lng: 28.2188, km: 6.9 },  // R34.01
  'bryntirion': { lat: -25.7405, lng: 28.22632, km: 6.9 },  // R34.24
  'hillcrest': { lat: -25.75806, lng: 28.24177, km: 7.0 },  // R34.86
  'lynnwood glen': { lat: -25.77278, lng: 28.27944, km: 7.2 },  // R35.52
  'menlo park': { lat: -25.76972, lng: 28.25556, km: 7.4 },  // R36.83
  'sinoville': { lat: -25.67556, lng: 28.21972, km: 7.5 },  // R37.33
  'lynnwood park': { lat: -25.77694, lng: 28.29333, km: 7.7 },  // R37.88
  'gezina': { lat: -25.71778, lng: 28.20972, km: 7.7 },  // R37.93
  'wonderboom south': { lat: -25.7, lng: 28.20861, km: 7.8 },  // R38.43
  'brooklyn': { lat: -25.76556, lng: 28.23972, km: 7.8 },  // R38.76
  'wonderboom': { lat: -25.68333, lng: 28.21139, km: 7.9 },  // R39.28
  'hazelwood': { lat: -25.77639, lng: 28.25861, km: 8.0 },  // R39.69
  'maroelana': { lat: -25.77944, lng: 28.26417, km: 8.2 },  // R40.46
  'baviaanspoort': { lat: -25.67278, lng: 28.35694, km: 8.2 },  // R40.51
  'faerie glen': { lat: -25.78167, lng: 28.30778, km: 8.4 },  // R41.77
  'alphenpark': { lat: -25.78167, lng: 28.26278, km: 8.5 },  // R41.83
  'menlyn': { lat: -25.78417, lng: 28.27556, km: 8.5 },  // R41.95
  'doornpoort': { lat: -25.64694, lng: 28.23556, km: 8.5 },  // R41.97
  'rosemary park': { lat: -25.67545, lng: 28.20919, km: 8.5 },  // R42.00
  'baileys muckleneuk': { lat: -25.76333, lng: 28.22583, km: 8.5 },  // R42.27
  'arcadia': { lat: -25.74563, lng: 28.21022, km: 8.6 },  // R42.57
  'new muckleneuk': { lat: -25.76917, lng: 28.23083, km: 8.7 },  // R43.02
  'ashlea gardens': { lat: -25.78583, lng: 28.26417, km: 8.9 },  // R43.87
  'wapadrand security village': { lat: -25.77561, lng: 28.3355, km: 9.0 },  // R44.49
  'de beers': { lat: -25.78917, lng: 28.27306, km: 9.1 },  // R44.84
  'sunnyside': { lat: -25.7575, lng: 28.21222, km: 9.1 },  // R45.26
  'waterkloof': { lat: -25.77917, lng: 28.23833, km: 9.2 },  // R45.40
  'newlands': { lat: -25.79278, lng: 28.27278, km: 9.5 },  // R46.83
  'eloffsdal': { lat: -25.71167, lng: 28.19056, km: 9.5 },  // R47.12
  'les marais': { lat: -25.70861, lng: 28.19028, km: 9.5 },  // R47.23
  'mamelodi': { lat: -25.71581, lng: 28.38083, km: 9.6 },  // R47.44
  'muckleneuk': { lat: -25.7625, lng: 28.21083, km: 9.6 },  // R47.49
  'trevenna': { lat: -25.74919, lng: 28.20104, km: 9.6 },  // R47.50
  'garsfontein': { lat: -25.79444, lng: 28.3, km: 9.7 },  // R47.85
  'waterkloofpark': { lat: -25.79222, lng: 28.25694, km: 9.7 },  // R48.22
  'wapadrand': { lat: -25.78248, lng: 28.33893, km: 9.8 },  // R48.58
  'mayville': { lat: -25.70111, lng: 28.18778, km: 9.8 },  // R48.64
  'waterkloof ridge': { lat: -25.78722, lng: 28.23889, km: 9.9 },  // R49.12
  'capital park': { lat: -25.72417, lng: 28.18778, km: 9.9 },  // R49.23
};

function getSuburbCoords(suburb) {
  if (!suburb) return null;
  const key = suburb.toLowerCase().trim()
    .replace(/['']/g, '').replace(/[éëêè]/g, 'e')
    .replace(/[âà]/g, 'a').replace(/[ôö]/g, 'o')
    .replace(/[ç]/g, 'c').replace(/[ü]/g, 'u')
    .replace(/[î]/g, 'i');
  return SUBURBS_DB[key] || null;
}

function calcDeliveryFeeBySuburb(suburb) {
  const coords = getSuburbCoords(suburb);
  if (!coords) return null;
  const km = coords.km;
  if (km < 3) return 5;
  return Math.round(km * 4.95 * 100) / 100;
}

function getAllSuburbs() {
  return Object.keys(SUBURBS_DB)
    .map(k => k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    .sort();
}

function filterSuburbs(prefix) {
  if (!prefix) return [];
  const q = prefix.toLowerCase().trim();
  return getAllSuburbs().filter(s => {
    const sl = s.toLowerCase();
    return sl.startsWith(q) || sl.includes(' ' + q);  // prefix match OR word-start match
  }).slice(0, 15);
}

window.SUBURBS_DB = SUBURBS_DB;
window.getSuburbCoords = getSuburbCoords;
window.calcDeliveryFeeBySuburb = calcDeliveryFeeBySuburb;
window.getAllSuburbs = getAllSuburbs;
window.filterSuburbs = filterSuburbs;