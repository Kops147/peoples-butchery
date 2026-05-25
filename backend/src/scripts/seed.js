import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    console.log('Starting seeding...');

    // Seed Admin
    const adminEmail = 'admin@thepeoplesbutchery.co.za';
    const adminExists = await pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
    
    if (adminExists.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin@Peoples2024', salt);
      await pool.query(
        'INSERT INTO users (name, surname, email, password_hash, is_admin, ref_number) VALUES ($1, $2, $3, $4, $5, $6)',
        ['Admin', 'User', adminEmail, hashedPassword, true, 'TPB-ADMIN']
      );
      console.log('Admin user created');
    }

    // Seed Products
    const products = [
      { name: 'Beef Stew', category: 'beef', price: 100.00, unit: 'kg', image: 'assets/img/food/beef_stew_meat.png' },
      { name: 'Brisket', category: 'beef', price: 130.00, unit: 'kg', image: 'assets/img/food/beef_brisket.png' },
      { name: 'Bulk Mince', category: 'beef', price: 80.00, unit: 'kg', image: 'assets/img/food/beef_mince.png' },
      { name: 'Beef Chuck', category: 'beef', price: 130.00, unit: 'kg', image: 'assets/img/food/beef_chuck_roast.png' },
      { name: 'Boerewors', category: 'beef', price: 95.99, unit: 'kg', image: 'assets/img/food/boerewors_coil.png' },
      { name: 'Chicken Wings', category: 'chicken', price: 75.00, unit: 'kg', image: 'assets/img/food/chicken_wings.png' },
      { name: 'Pork Chops', category: 'pork', price: 89.00, unit: 'kg', image: 'assets/img/food/pork_chops.png' },
      { name: 'Lamb Chops', category: 'lamb', price: 140.00, unit: 'kg', image: 'assets/img/food/lamb_chops.png' },
      { name: '2 Steak 1 Wors', category: 'meal', price: 90.00, unit: 'each', image: 'assets/img/food/meal_2steak_wors_r90.png' },
      { name: '1 Steak 1 Wors 1 Chicken', category: 'meal', price: 75.00, unit: 'each', image: 'assets/img/food/meal_steak_wors_chicken_r75.png' },
    ];

    for (const p of products) {
      const productExists = await pool.query('SELECT * FROM products WHERE name = $1', [p.name]);
      if (productExists.rows.length === 0) {
        await pool.query(
          'INSERT INTO products (name, category, price, unit, image) VALUES ($1, $2, $3, $4, $5)',
          [p.name, p.category, p.price, p.unit, p.image]
        );
      }
    }
    console.log('Products seeded');

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
