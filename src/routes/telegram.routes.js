const router = require('express').Router();
const { body } = require('express-validator');
const authenticate       = require('../middleware/authenticate');
const authorize          = require('../middleware/authorize');
const validate           = require('../middleware/validate');
const telegramController = require('../controllers/telegram.controller');

// Webhook — no auth
router.post('/webhook', telegramController.webhook);

router.use(authenticate);

router.get('/status', telegramController.status);

router.post('/connect',
  authorize('admin'),
  [
    body('studentId').isMongoId().withMessage('Invalid student ID'),
    body('chatId').notEmpty().withMessage('Chat ID is required'),
    body('telegramUsername').optional().trim(),
  ],
  validate,
  telegramController.manualConnect
);

router.post('/send',
  [
    body('studentId').isMongoId().withMessage('Invalid student ID'),
    body('zoomLink').isURL().withMessage('Valid Zoom link required'),
  ],
  validate,
  telegramController.send
);

router.post('/send-bulk',
  [
    body('studentIds').isArray({ min: 1 }).withMessage('studentIds array required'),
    body('studentIds.*').isMongoId().withMessage('Invalid student ID'),
    body('zoomLink').isURL().withMessage('Valid Zoom link required'),
  ],
  validate,
  telegramController.sendBulk
);

module.exports = router;
