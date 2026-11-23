// middleware/authMiddleware.js
const { verifyToken } = require('../utils/jwt');

const authenticate = async (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    req.user = await verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (roles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ message: 'Permission denied' });
    }
  };
};

module.exports = { authenticate, authorize };
