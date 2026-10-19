const { validationResult } = require('express-validator');
const { badRequest } = require('../utils/response');

/**
 * Run after express-validator chains.
 * Returns 400 with error details if validation failed.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, 'Validation failed', errors.array());
  }
  next();
};

module.exports = validate;
