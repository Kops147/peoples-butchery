/* =============================================
   The Peoples Butchery — Product Catalog
   Single source of truth for default products.
   Used by shop.js (customer view) and admin.js
   (seeding Firestore on first run).
   ============================================= */

export const LOCAL_CATALOG = [
  { stock_code: "1125", name: "Short Rib",            price: 130.00, unit: "per kg",    category: "Beef",     image: "assets/img/food/1125.jpg" },
  { stock_code: "1126", name: "Beef Stew",             price: 100.00, unit: "per kg",    category: "Beef",     image: "assets/img/food/1126.jpg" },
  { stock_code: "1124", name: "Brisket",               price: 130.00, unit: "per kg",    category: "Beef",     image: "assets/img/food/1124.jpg" },
  { stock_code: "137",  name: "Bulk Mince",             price:  80.00, unit: "per kg",    category: "Beef",     image: "assets/img/food/137.jpg"  },
  { stock_code: "1123", name: "Chuck",                 price: 130.00, unit: "per kg",    category: "Beef",     image: "assets/img/food/1123.jpg" },
  { stock_code: "1166", name: "Frozen Chicken Hearts", price:  35.00, unit: "each",      category: "Chicken",  image: "assets/img/food/1166.jpg" },
  { stock_code: "37",   name: "Lamb Tripe",             price:  30.00, unit: "per kg",    category: "Lamb",     image: "assets/img/food/37.jpg"   },
  { stock_code: "291",  name: "Lamb Chops",             price: 140.00, unit: "per kg",    category: "Lamb",     image: "assets/img/food/291.jpg"  },
  { stock_code: "1179", name: "Lamb Stew",             price: 140.00, unit: "per kg",    category: "Lamb",     image: "assets/img/food/1179.jpg" },
  { stock_code: "130",  name: "Black Lentils",          price:  10.00, unit: "per 200g",  category: "Other",    image: "assets/img/food/130.jpg"  },
  { stock_code: "124",  name: "Pink Lentils",           price:  15.00, unit: "per 200g",  category: "Other",    image: "assets/img/food/124.jpg"  },
  { stock_code: "1206", name: "Boerewors",             price:  95.99, unit: "per kg",    category: "Sausages", image: "assets/img/food/1206.jpg" },
  { stock_code: "1112", name: "Chilli Bites",          price: 350.00, unit: "each",      category: "Sides",    image: "assets/img/food/1112.jpg" },
  { stock_code: "atchar",         name: "Atchar",        price:   6.00, unit: "each",      category: "Sides",    image: "assets/img/food/atchar.jpg"         },
  { stock_code: "curry-chillies", name: "Curry Chillies",price:  10.00, unit: "each",      category: "Sides",    image: "assets/img/food/curry-chillies.jpg" },
  { stock_code: "172",  name: "Chicken Steak & Wors",  price:   0.00, unit: "each",      category: "Chicken",  image: "assets/img/food/172.jpg"  },

  // ── Cooked Combo Meals (all served with Pap & Gravy) ──────────────────
  { stock_code: "cm-sw",   name: "1 Steak + 1 Wors",             price: 65.00, unit: "plate", category: "Cooked Meals", description: "With Pap & Gravy", image: "assets/img/food/172 ChickenSteakAndWors.jpeg" },
  { stock_code: "cm-wc",   name: "1 Wors + 1 Chicken",           price: 65.00, unit: "plate", category: "Cooked Meals", description: "With Pap & Gravy", image: "assets/img/food/172 ChickenSteakAndWors.jpeg" },
  { stock_code: "cm-ssw",  name: "2 Steak + 1 Wors",             price: 90.00, unit: "plate", category: "Cooked Meals", description: "With Pap & Gravy", image: "assets/img/food/172 ChickenSteakAndWors.jpeg" },
  { stock_code: "cm-swc",  name: "1 Steak + 1 Wors + 1 Chicken", price: 75.00, unit: "plate", category: "Cooked Meals", description: "With Pap & Gravy", image: "assets/img/food/172 ChickenSteakAndWors.jpeg" },

  // ── Specials ───────────────────────────────────────────────────────────
  { stock_code: "sp-curry", name: "Special: Mutton Curry",        price: 65.00, unit: "plate", category: "Specials",     description: "Rich slow-cooked mutton curry",  image: "assets/img/food/1179.jpg" },

  // ── Daily Meals ────────────────────────────────────────────────────────
  { stock_code: "dm-mogodu",  name: "Pap & Mogodu",               price: 50.00, unit: "plate", category: "Daily Meals",  description: "Traditional tripe with pap",            image: "assets/img/food/37.jpg"   },
  { stock_code: "dm-stew",    name: "Pap & Beef Stew",            price: 50.00, unit: "plate", category: "Daily Meals",  description: "Slow-cooked beef stew with pap",        image: "assets/img/food/1126.jpg" },
  { stock_code: "dm-pens",    name: "Pens & Pooitjies with Salad",price: 50.00, unit: "plate", category: "Daily Meals",  description: "Slow-cooked offal with fresh salad",    image: "assets/img/food/37.jpg"   },
  { stock_code: "dm-halfskop",name: "Halfskop",                   price: 40.00, unit: "each",  category: "Daily Meals",  description: "Half head — a township classic",        image: "assets/img/food/meatOnbraai.jpg" },
  { stock_code: "dm-hs-pap",  name: "Halfskop & Pap",             price: 45.00, unit: "plate", category: "Daily Meals",  description: "Halfskop served with pap",              image: "assets/img/food/meatOnbraai.jpg" },

  // ── Weekend Club Specials ──────────────────────────────────────────────
  { stock_code: "wcs-small",  name: "Weekend Club Special — Small", price:  70.00, unit: "plate", category: "Weekend Specials", description: "Steak & Wors with Pap",          image: "assets/img/food/172 ChickenSteakAndWors.jpeg" },
  { stock_code: "wcs-large",  name: "Weekend Club Special — Large", price: 140.00, unit: "plate", category: "Weekend Specials", description: "Steak, Wors & Chicken with Pap", image: "assets/img/food/172 ChickenSteakAndWors.jpeg" },
];

const COOKED_CATEGORIES = new Set(['Sides', 'Other', 'Cooked Meals', 'Specials', 'Daily Meals', 'Weekend Specials']);

export function mapToProduct(p) {
  const category = COOKED_CATEGORIES.has(p.category) ? 'cooked' : 'raw';
  const image = p.image || 'assets/img/food/meat_on_braai.jpg';
  return {
    id: p.stock_code || p.name.replace(/\s+/g, '-').toLowerCase(),
    name: p.name,
    category,
    categoryLabel: p.category || 'Other',
    description: p.description || '',
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
