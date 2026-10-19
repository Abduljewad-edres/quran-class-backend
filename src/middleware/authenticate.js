const { verifyToken } = require('../config/jwt');
const { unauthorized } = require('../utils/response');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return unauthorized(res, 'No token provided');

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    // Support both id and _id (MongoDB uses _id)
    req.user = { ...decoded, id: decoded.id || decoded._id };
    next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }
};

module.exports = authenticate;
