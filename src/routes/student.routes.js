const router = require('express').Router();
const { body, param } = require('express-validator');
const authenticate      = require('../middleware/authenticate');
const authorize         = require('../middleware/authorize');
const validate          = require('../middleware/validate');
const studentController = require('../controllers/student.controller');

router.use(authenticate);

const studentBody = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('learningType').isIn(['hifz','qaida','nethor','tajweed','recitation','other']).withMessage('Invalid learning type'),
];

router.get('/', studentController.list);
router.post('/', authorize('admin'), studentBody, validate, studentController.create);

router.get('/:id',  [param('id').isMongoId()], validate, studentController.getOne);
router.put('/:id',  authorize('admin'), [param('id').isMongoId(), ...studentBody], validate, studentController.update);
router.delete('/:id', authorize('admin'), [param('id').isMongoId()], validate, studentController.remove);

module.exports = router;
