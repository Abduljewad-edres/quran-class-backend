const router = require('express').Router();
const { body, param } = require('express-validator');
const authenticate         = require('../middleware/authenticate');
const authorize            = require('../middleware/authorize');
const validate             = require('../middleware/validate');
const permissionController = require('../controllers/permission.controller');

router.use(authenticate);

router.get('/', permissionController.list);

router.post('/',
  authorize('teacher'),
  [
    body('type').isIn(['leave','schedule_change','class_cancellation','student_issue','emergency','other']),
    body('requestDate').isDate(),
    body('reason').trim().notEmpty().withMessage('Reason is required'),
  ],
  validate,
  permissionController.create
);

router.patch('/:id/approve',
  authorize('admin'),
  [param('id').isMongoId()],
  validate,
  permissionController.approve
);

router.patch('/:id/reject',
  authorize('admin'),
  [param('id').isMongoId()],
  validate,
  permissionController.reject
);

module.exports = router;
