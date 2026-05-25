import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const register = async (req, res) => {
  const { name, surname, email, password, phone, address, suburb, coordinates } = req.body;

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a unique REF number
    const refNumber = 'TPB-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    const newUser = await pool.query(
      'INSERT INTO users (name, surname, email, password_hash, phone, address, suburb, coordinates, ref_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, email, ref_number',
      [name, surname, email, hashedPassword, phone, address, suburb, JSON.stringify(coordinates), refNumber]
    );

    const token = jwt.sign({ id: newUser.rows[0].id, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });

    res.status(201).json({ token, user: newUser.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, isAdmin: user.rows[0].is_admin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );

    const { password_hash, ...userData } = user.rows[0];
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
