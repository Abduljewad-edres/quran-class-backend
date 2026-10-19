const router = require('express').Router();
const { body } = require('express-validator');
const validate      = require('../middleware/validate');
const authenticate  = require('../middleware/authenticate');
const authController = require('../controllers/auth.controller');

// POST /api/auth/login
router.post('/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout);

// POST /api/auth/change-password
router.post('/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  authController.changePassword
);

// GET /api/auth/me
router.get('/me', authenticate, authController.me);

module.exports = router;
