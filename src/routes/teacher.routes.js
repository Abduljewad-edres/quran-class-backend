const router = require('express').Router();
const { body, param } = require('express-validator');
const authenticate      = require('../middleware/authenticate');
const authorize         = require('../middleware/authorize');
const validate          = require('../middleware/validate');
const teacherController = require('../controllers/teacher.controller');

router.use(authenticate);

const teacherBody = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('specialization').optional().isIn(['hifz','qaida','nethor','tajweed','recitation','other']),
  body('monthlyRate').notEmpty().isNumeric().withMessage('Monthly rate must be a number'),
  body('teachingDays').notEmpty().withMessage('At least one teaching day required'),
];

router.get('/',    authorize('admin'), teacherController.list);
router.post('/',   authorize('admin'), teacherBody, validate, teacherController.create);

router.get('/:id',
  authorize('admin'),
  [param('id').isMongoId().withMessage('Invalid ID')],
  validate,
  teacherController.getOne
);

router.put('/:id',
  [param('id').isMongoId().withMessage('Invalid ID')],
  validate,
  teacherController.update
);

router.patch('/:id/status',
  authorize('admin'),
  [
    param('id').isMongoId().withMessage('Invalid ID'),
    body('status').isIn(['active','inactive','suspended']).withMessage('Invalid status'),
  ],
  validate,
  teacherController.updateStatus
);

router.delete('/:id',
  authorize('admin'),
  [param('id').isMongoId().withMessage('Invalid ID')],
  validate,
  teacherController.remove
);

module.exports = router;
