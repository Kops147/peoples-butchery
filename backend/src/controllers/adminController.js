import pool from '../config/database.js';

export const getStats = async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const totalOrders = await pool.query('SELECT COUNT(*) FROM orders');
    const totalRevenue = await pool.query('SELECT SUM(total) FROM orders WHERE is_paid = TRUE');
    const pendingOrders = await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'pending'");

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalOrders: parseInt(totalOrders.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].sum || 0),
      pendingOrders: parseInt(pendingOrders.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await pool.query(`
      SELECT o.*, u.name as user_name, u.surname as user_surname, u.phone as user_phone 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `);
    res.json(orders.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  try {
    const updated = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (updated.rows.length === 0) return res.status(404).json({ message: 'Order not found' });

    // SMS notification removed (Alibaba Cloud decommissioned)

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await pool.query('SELECT id, name, surname, email, phone, address, suburb, ref_number, credit_balance, loyalty_points, is_admin, created_at FROM users');
    res.json(users.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
