const { verifyToken: verifyJwt } = require('../utils/jwt');

// Middleware to verify the token
const verifyToken = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Token missing' });
  }

  try {
    req.user = await verifyJwt(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};
module.exports = verifyToken
