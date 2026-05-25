import pool from '../config/database.js';

export const getMe = async (req, res) => {
  try {
    const user = await pool.query('SELECT id, name, surname, email, phone, address, suburb, ref_number, credit_balance, loyalty_points FROM users WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(user.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const updateMe = async (req, res) => {
  const { name, surname, phone, address, suburb } = req.body;
  try {
    const updated = await pool.query(
      'UPDATE users SET name = $1, surname = $2, phone = $3, address = $4, suburb = $5 WHERE id = $6 RETURNING id, name, surname, email, phone, address, suburb',
      [name, surname, phone, address, suburb, req.user.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getLoyalty = async (req, res) => {
  try {
    const loyalty = await pool.query('SELECT loyalty_points, credit_balance FROM users WHERE id = $1', [req.user.id]);
    res.json(loyalty.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
