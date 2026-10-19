const router = require('express').Router();
const { body, param } = require('express-validator');
const authenticate          = require('../middleware/authenticate');
const authorize             = require('../middleware/authorize');
const validate              = require('../middleware/validate');
const assignmentController  = require('../controllers/assignment.controller');

router.use(authenticate, authorize('admin'));

router.get('/', assignmentController.list);

router.post('/',
  [
    body('studentId').isMongoId().withMessage('Invalid student ID'),
    body('teacherId').isMongoId().withMessage('Invalid teacher ID'),
    body('effectiveDate').isDate().withMessage('effectiveDate must be a valid date'),
    body('teachingDays').isArray({ min: 1 }).withMessage('At least one teaching day required'),
  ],
  validate,
  assignmentController.create
);

router.put('/:id',
  [param('id').isMongoId().withMessage('Invalid ID')],
  validate,
  assignmentController.transfer
);

router.delete('/:id',
  [param('id').isMongoId().withMessage('Invalid ID')],
  validate,
  assignmentController.end
);

module.exports = router;
