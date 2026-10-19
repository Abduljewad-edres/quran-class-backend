const router = require('express').Router();
const authenticate      = require('../middleware/authenticate');
const authorize         = require('../middleware/authorize');
const reportController  = require('../controllers/report.controller');

router.use(authenticate, authorize('admin'));

// GET /api/reports/teachers
router.get('/teachers', reportController.teachers);

// GET /api/reports/students
router.get('/students', reportController.students);

// GET /api/reports/attendance
router.get('/attendance', reportController.attendance);

// GET /api/reports/salary
router.get('/salary', reportController.salary);

// GET /api/reports/dashboard  (admin dashboard stats)
router.get('/dashboard', reportController.dashboard);

module.exports = router;
