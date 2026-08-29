const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/response');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1].trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return forbidden(res, 'Token expired. Please log in again.');
    }
    return forbidden(res, 'Invalid or expired token.');
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return forbidden(res, 'Access denied. Admin privileges required.');
};

module.exports = { verifyToken, verifyAdmin };
