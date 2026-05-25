import jwt from 'jsonwebtoken';

export const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied, admin only' });
    }
    next();
  });
};
