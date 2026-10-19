const router = require('express').Router();
const { body, param } = require('express-validator');
const authenticate     = require('../middleware/authenticate');
const authorize        = require('../middleware/authorize');
const validate         = require('../middleware/validate');
const salaryController = require('../controllers/salary.controller');

router.use(authenticate);

router.get('/', salaryController.list);

// MUST be before /:id
router.post('/generate',
  authorize('admin'),
  [
    body('month').matches(/^\d{4}-\d{2}$/).withMessage('month must be YYYY-MM'),
    body('teacherId').optional().isMongoId(),
  ],
  validate,
  salaryController.generate
);

router.get('/:id',  [param('id').isMongoId()], validate, salaryController.getOne);

router.post('/:id/pay',
  authorize('admin'),
  [
    param('id').isMongoId(),
    body('paymentDate').isDate(),
    body('amountPaid').isFloat({ min: 0 }),
  ],
  validate,
  salaryController.markPaid
);

module.exports = router;
