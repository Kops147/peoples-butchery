import pool from '../config/database.js';

export const getProducts = async (req, res) => {
  try {
    const products = await pool.query('SELECT * FROM products WHERE in_stock = TRUE');
    res.json(products.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (product.rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json(product.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const createProduct = async (req, res) => {
  const { name, category, price, unit, image, description } = req.body;
  try {
    const newProduct = await pool.query(
      'INSERT INTO products (name, category, price, unit, image, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, category, price, unit, image, description]
    );
    res.status(201).json(newProduct.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  const { name, category, price, unit, image, description, in_stock } = req.body;
  try {
    const updated = await pool.query(
      'UPDATE products SET name = $1, category = $2, price = $3, unit = $4, image = $5, description = $6, in_stock = $7 WHERE id = $8 RETURNING *',
      [name, category, price, unit, image, description, in_stock, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
