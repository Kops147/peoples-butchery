/* =============================================
   The Peoples Butchery — Product Catalog
   Single source of truth for default products.
   Used by shop.js (customer view) and admin.js
   (seeding Firestore on first run).
   ============================================= */

export const LOCAL_CATALOG = [
  { stock_code: "1125", name: "Short Rib",            price: 130.00, unit: "per kg",    category: "Beef",     drive_id: "1Ofd1gq1UNaPuSVSPKkIGw3Hh8r6-NyTN" },
  { stock_code: "1126", name: "Beef Stew",             price: 100.00, unit: "per kg",    category: "Beef",     drive_id: "1c6JlAGNj4AXs1nzYJpazZ2ViPEGn5nXw" },
  { stock_code: "1124", name: "Brisket",               price: 130.00, unit: "per kg",    category: "Beef",     drive_id: "1kjfRGFHmOnkjcjOTtwORJZHzVZuvcpNW" },
  { stock_code: "137",  name: "Bulk Mince",             price:  80.00, unit: "per kg",    category: "Beef",     drive_id: "1agibL0AkpUHBuTY7socRvi1vpjlFiIPF" },
  { stock_code: "1123", name: "Chuck",                 price: 130.00, unit: "per kg",    category: "Beef",     drive_id: "1aqdd-Th_h-aKvz9_acxw7bnSevOdtgWV" },
  { stock_code: "1166", name: "Frozen Chicken Hearts", price:  35.00, unit: "each",      category: "Chicken",  drive_id: "1Ni6T-75epUulfVF7oZIs04i4ZARz3BQw" },
  { stock_code: "37",   name: "Lamb Tripe",             price:  30.00, unit: "per kg",    category: "Lamb",     drive_id: "1bDCsToJF80-GUXOdfPzi5xINEZ5aRUpD" },
  { stock_code: "291",  name: "Lamb Chops",             price: 140.00, unit: "per kg",    category: "Lamb",     drive_id: "1a4lGu8vHg3L8icifPAOcLctczl5-civ4" },
  { stock_code: "1179", name: "Lamb Stew",             price: 140.00, unit: "per kg",    category: "Lamb",     drive_id: "1EVFKAWdF0E_0hSmy7jUyCSv1xxjos_c5" },
  { stock_code: "130",  name: "Black Lentils",          price:  10.00, unit: "per 200g",  category: "Other",    drive_id: "1HVXJRirv0LM1Xm9RAIZ6bStpu7poOeHU" },
  { stock_code: "124",  name: "Pink Lentils",           price:  15.00, unit: "per 200g",  category: "Other",    drive_id: "1AnDHYlofn2EdGoPkqKpl2BBmac04dBi5" },
  { stock_code: "1206", name: "Boerewors",             price:  95.99, unit: "per kg",    category: "Sausages", drive_id: "1_RUyI0ndo4OSI_F5G1OE5VKk3Pe53dYo" },
  { stock_code: "1112", name: "Chilli Bites",          price: 350.00, unit: "each",      category: "Sides",    drive_id: "1MIQfu3KakyxcxZdde-0h0LQrT-JEyzeX" },
  { stock_code: "atchar",        name: "Atchar",         price:   6.00, unit: "each",      category: "Sides",    drive_id: "1aJtiWUkoAQU7sxaocEt44xR6gdX2vsGy" },
  { stock_code: "curry-chillies", name: "Curry Chillies", price: 10.00, unit: "each",      category: "Sides",    drive_id: "1dGrKAMe1EexTrp_8ix1sjYcS033mqppy" },
];

const COOKED_CATEGORIES = new Set(['Sides', 'Other']);

export function mapToProduct(p) {
  const category = COOKED_CATEGORIES.has(p.category) ? 'cooked' : 'raw';
  const image = p.drive_id
    ? `https://drive.google.com/uc?id=${p.drive_id}`
    : 'assets/img/food/meat_on_braai.jpg';
  return {
    id: p.stock_code || p.name.replace(/\s+/g, '-').toLowerCase(),
    name: p.name,
    category,
    categoryLabel: p.category || 'Other',
    description: '',
    price: parseFloat(p.price) || 0,
    unit: p.unit || 'per kg',
    image,
    image_url: image,
    is_active: true,
    available: true,
    stockQty: 100,
    isSpecial: false,
    discount_price: null,
    createdAt: new Date().toISOString(),
  };
}
