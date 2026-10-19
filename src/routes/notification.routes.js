const router = require('express').Router();
const { param, body } = require('express-validator');
const authenticate           = require('../middleware/authenticate');
const authorize              = require('../middleware/authorize');
const validate               = require('../middleware/validate');
const notificationController = require('../controllers/notification.controller');

router.use(authenticate);

router.get('/', notificationController.list);

router.post('/send',
  authorize('admin'),
  [
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('title').trim().notEmpty(),
  ],
  validate,
  notificationController.send
);

// read-all MUST be before /:id
router.patch('/read-all', notificationController.markAllRead);

router.patch('/:id/read',
  [param('id').isMongoId()],
  validate,
  notificationController.markRead
);

module.exports = router;
