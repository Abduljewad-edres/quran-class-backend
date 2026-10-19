const router = require('express').Router();
const { body, query } = require('express-validator');
const authenticate         = require('../middleware/authenticate');
const validate             = require('../middleware/validate');
const attendanceController = require('../controllers/attendance.controller');

router.use(authenticate);

router.get('/today',   attendanceController.today);
router.get('/reports', attendanceController.reports);

router.get('/history',
  [
    query('startDate').optional().isDate(),
    query('endDate').optional().isDate(),
    query('studentId').optional().isMongoId(),
    query('teacherId').optional().isMongoId(),
  ],
  validate,
  attendanceController.history
);

router.post('/',
  [
    body('records').isArray({ min: 1 }).withMessage('records array is required'),
    body('records.*.studentId').isMongoId().withMessage('Invalid student ID'),
    body('records.*.status').isIn(['present','absent','permitted']),
    body('attendanceDate').isDate().withMessage('attendanceDate is required'),
  ],
  validate,
  attendanceController.submit
);

router.get('/', attendanceController.list);

module.exports = router;
