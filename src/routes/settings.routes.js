const router = require('express').Router();
const { body } = require('express-validator');
const authenticate      = require('../middleware/authenticate');
const authorize         = require('../middleware/authorize');
const validate          = require('../middleware/validate');
const settingsController = require('../controllers/settings.controller');

router.use(authenticate, authorize('admin'));

// GET /api/settings
router.get('/', settingsController.list);

// PUT /api/settings
router.put('/',
  [body('settings').isObject().withMessage('settings object required')],
  validate,
  settingsController.update
);

module.exports = router;
