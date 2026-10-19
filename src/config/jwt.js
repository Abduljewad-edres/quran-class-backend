const jwt = require('jsonwebtoken');

const SECRET     = process.env.JWT_SECRET     || 'fallback_dev_secret_change_me';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT for a user row
 * @param {{ id, role, username }} payload
 */
const signToken = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });

/**
 * Verify and decode a JWT string
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
const verifyToken = (token) =>
  jwt.verify(token, SECRET);

module.exports = { signToken, verifyToken };
