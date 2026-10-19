const Student    = require('../models/Student');
const Teacher    = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const Group      = require('../models/Group');
const Attendance = require('../models/Attendance');
const audit      = require('../utils/audit');
const { ok, created, noContent, notFound, forbidden, serverError } = require('../utils/response');

const populateStudent = async (student) => {
  const assignment = await Assignment.findOne({ studentId: student._id, status: 'active' })
    .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } })
    .populate('groupId', 'name');

  return {
    id:                 student._id,
    full_name:          student.fullName,
    phone:              student.phone,
    guardian_name:      student.guardianName,
    guardian_phone:     student.guardianPhone,
    learning_type:      student.learningType,
    status:             student.status,
    notes:              student.notes,
    telegram_username:  student.telegramUsername,
    telegram_connected: student.telegramConnected,
    teacher_id:         assignment?.teacherId?._id,
    teacher_name:       assignment?.teacherId?.userId?.fullName,
    group_id:           assignment?.groupId?._id,
    group_name:         assignment?.groupId?.name,
    teaching_days:      assignment?.teachingDays?.join(','),
    teaching_time:      assignment?.teachingTime,
    assignment_status:  assignment?.status,
  };
};

// GET /api/students
exports.list = async (req, res) => {
  try {
    let students;

    if (req.user.role === 'teacher') {
      const teacher     = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) return forbidden(res);
      const assignments = await Assignment.find({ teacherId: teacher._id, status: 'active' }).populate('studentId');
      students = assignments.map(a => a.studentId).filter(Boolean);
    } else {
      students = await Student.find();
    }

    const result = await Promise.all(students.map(populateStudent));
    return ok(res, result);
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/students
exports.create = async (req, res) => {
  try {
    const { fullName, phone, guardianName, guardianPhone, learningType, telegramUsername, notes } = req.body;
    const tg = telegramUsername ? telegramUsername.replace(/^@/, '') : null;

    const student = await Student.create({ fullName, phone, guardianName, guardianPhone, learningType, telegramUsername: tg, notes });

    audit({ actorId: req.user.id, actorRole: 'admin', action: 'create_student', entityType: 'student', entityId: student._id, description: `Created student: ${fullName}`, ipAddress: req.ip });
    return created(res, { id: student._id }, 'Student created');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/students/:id
exports.getOne = async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      const active  = await Assignment.findOne({ studentId: req.params.id, teacherId: teacher?._id, status: 'active' });
      if (!active) return forbidden(res);
    }
    const student = await Student.findById(req.params.id);
    if (!student) return notFound(res, 'Student not found');
    return ok(res, await populateStudent(student));
  } catch (err) {
    return serverError(res, err.message);
  }
};

// PUT /api/students/:id
exports.update = async (req, res) => {
  try {
    const { fullName, phone, guardianName, guardianPhone, learningType, status, notes, telegramUsername } = req.body;
    const tg = telegramUsername ? telegramUsername.replace(/^@/, '') : undefined;

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { fullName, phone, guardianName, guardianPhone, learningType, status, notes, ...(tg !== undefined ? { telegramUsername: tg } : {}) },
      { new: true }
    );
    if (!student) return notFound(res, 'Student not found');

    audit({ actorId: req.user.id, actorRole: 'admin', action: 'update_student', entityType: 'student', entityId: student._id, ipAddress: req.ip });
    return ok(res, {}, 'Student updated');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// DELETE /api/students/:id
exports.remove = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return notFound(res, 'Student not found');

    await Assignment.updateMany({ studentId: student._id, status: 'active' }, { status: 'ended', endDate: new Date() });
    await Attendance.deleteMany({ studentId: student._id });
    await student.deleteOne();

    audit({ actorId: req.user.id, actorRole: 'admin', action: 'delete_student', entityType: 'student', entityId: req.params.id, ipAddress: req.ip });
    return noContent(res);
  } catch (err) {
    return serverError(res, err.message);
  }
};
