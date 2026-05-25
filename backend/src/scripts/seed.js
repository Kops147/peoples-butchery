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
      { name: 'Beef Mince', category: 'beef', price: 85.00, unit: 'kg', image: 'assets/img/food/beef_mince.png' },
      { name: 'Beef Chuck', category: 'beef', price: 95.00, unit: 'kg', image: 'assets/img/food/beef_chuck_roast.png' },
      { name: 'Boerewors', category: 'beef', price: 110.00, unit: 'kg', image: 'assets/img/food/boerewors_coil.png' },
      { name: 'Chicken Wings', category: 'chicken', price: 75.00, unit: 'kg', image: 'assets/img/food/chicken_wings.png' },
      { name: 'Pork Chops', category: 'pork', price: 89.00, unit: 'kg', image: 'assets/img/food/pork_chops.png' },
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
