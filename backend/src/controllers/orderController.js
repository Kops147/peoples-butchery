import pool from '../config/database.js';

export const createOrder = async (req, res) => {
  const { items, total, deliveryMethod, deliveryAddress, deliveryFee, paymentMethod } = req.body;
  const userId = req.user.id;

  try {
    await pool.query('BEGIN');

    const newOrder = await pool.query(
      'INSERT INTO orders (user_id, items, total, delivery_method, delivery_address, delivery_fee, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [userId, JSON.stringify(items), total, deliveryMethod, deliveryAddress, deliveryFee, paymentMethod]
    );

    // Update loyalty points (1 point per R10)
    const pointsEarned = Math.floor(total / 10);
    await pool.query('UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2', [pointsEarned, userId]);

    await pool.query('COMMIT');

    // SMS notification removed (Alibaba Cloud decommissioned)

    res.status(201).json(newOrder.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const orders = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(orders.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (order.rows.length === 0) return res.status(404).json({ message: 'Order not found' });
    res.json(order.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
