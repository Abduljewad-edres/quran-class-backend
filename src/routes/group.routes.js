const router = require('express').Router();
const { body, param } = require('express-validator');
const authenticate    = require('../middleware/authenticate');
const authorize       = require('../middleware/authorize');
const validate        = require('../middleware/validate');
const groupController = require('../controllers/group.controller');

router.use(authenticate);

router.get('/', groupController.list);
router.post('/', authorize('admin'),
  [
    body('teacherId').isMongoId().withMessage('Invalid teacher ID'),
    body('name').trim().notEmpty(),
    body('learningType').isIn(['hifz','qaida','nethor','tajweed','recitation','other']),
    body('teachingDays').isArray({ min: 1 }),
  ],
  validate, groupController.create
);

router.get('/:id',    [param('id').isMongoId()], validate, groupController.getOne);
router.put('/:id',    authorize('admin'), [param('id').isMongoId()], validate, groupController.update);
router.delete('/:id', authorize('admin'), [param('id').isMongoId()], validate, groupController.remove);

module.exports = router;
