/* =============================================
   The Peoples Butchery — Product Catalog
   Single source of truth for default products.
   Used by shop.js (customer view) and admin.js
   (seeding Firestore on first run).
   ============================================= */

export const LOCAL_CATALOG = [
  { stock_code: "1125", name: "Short Rib",            price: 130.00, unit: "per kg",    category: "Beef",     image: "assets/img/food/1125ShortRib R130 per kilo.jpeg" },
  { stock_code: "1126", name: "Beef Stew",             price: 100.00, unit: "per kg",    category: "Beef",     image: "assets/img/food/1126 BeefStew R100 per kilo.jpeg" },
  { stock_code: "1124", name: "Brisket",               price: 130.00, unit: "per kg",    category: "Beef",     image: "assets/img/food/1124 Brisket R130 per kg.jpeg" },
  { stock_code: "137",  name: "Bulk Mince",             price:  80.00, unit: "per kg",    category: "Beef",     image: "assets/img/food/137  BulkMince R80perKilo.jpeg" },
  { stock_code: "1123", name: "Chuck",                 price: 130.00, unit: "per kg",    category: "Beef",     image: "assets/img/food/1123 Chuck R130 per kilo.jpeg" },
  { stock_code: "1166", name: "Frozen Chicken Hearts", price:  35.00, unit: "each",      category: "Chicken",  image: "assets/img/food/1166 frozen chicken hearts R35.jpeg" },
  { stock_code: "37",   name: "Lamb Tripe",             price:  30.00, unit: "per kg",    category: "Lamb",     image: "assets/img/food/37 Lamb tribe R30 per kg.jpeg" },
  { stock_code: "291",  name: "Lamb Chops",             price: 140.00, unit: "per kg",    category: "Lamb",     image: "assets/img/food/291 LambChops R140 per kilo.jpeg" },
  { stock_code: "1179", name: "Lamb Stew",             price: 140.00, unit: "per kg",    category: "Lamb",     image: "assets/img/food/1179 LambStew R140perKilo.jpeg" },
  { stock_code: "130",  name: "Black Lentils",          price:  10.00, unit: "per 200g",  category: "Other",    image: "assets/img/food/130 BlackLintels R10 for 200grams.jpeg" },
  { stock_code: "124",  name: "Pink Lentils",           price:  15.00, unit: "per 200g",  category: "Other",    image: "assets/img/food/124 PinkLintels R15 for 200gram.jpeg" },
  { stock_code: "1206", name: "Boerewors",             price:  95.99, unit: "per kg",    category: "Sausages", image: "assets/img/food/1206 Boerewors  R95.99 per kilo.jpeg" },
  { stock_code: "1112", name: "Chilli Bites",          price: 350.00, unit: "each",      category: "Sides",    image: "assets/img/food/1112 Chilli Bytes R350.jpeg" },
  { stock_code: "atchar",         name: "Atchar",        price:   6.00, unit: "each",      category: "Sides",    image: "assets/img/food/Sides-Atchar R6.jpeg" },
  { stock_code: "curry-chillies", name: "Curry Chillies",price:  10.00, unit: "each",      category: "Sides",    image: "assets/img/food/Sides-CurryChillies R10.jpeg" },
];

const COOKED_CATEGORIES = new Set(['Sides', 'Other']);

export function mapToProduct(p) {
  const category = COOKED_CATEGORIES.has(p.category) ? 'cooked' : 'raw';
  const image = p.image || 'assets/img/food/meat_on_braai.jpg';
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
