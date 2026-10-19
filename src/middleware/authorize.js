const { forbidden } = require('../utils/response');

/**
 * Role-based authorization gate
 * Usage: authorize('admin') or authorize('admin', 'teacher')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return forbidden(res, 'You do not have permission to perform this action');
  }
  next();
};

module.exports = authorize;
