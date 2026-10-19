const bcrypt     = require('bcrypt');
const User       = require('../models/User');
const Teacher    = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const audit      = require('../utils/audit');
const { ok, created, noContent, notFound, conflict, forbidden, serverError } = require('../utils/response');

const formatTeacher = (user, teacher, activeStudents = 0) => ({
  id:               user._id,
  teacher_id:       teacher._id,
  full_name:        user.fullName,
  username:         user.username,
  email:            user.email,
  status:           user.status,
  last_login_at:    user.lastLoginAt,
  must_change_pwd:  user.mustChangePwd,
  phone:            teacher.phone,
  telegram_username:teacher.telegramUsername,
  specialization:   teacher.specialization,
  teaching_days:    teacher.teachingDays?.join(','),
  teaching_time:    teacher.teachingTime,
  monthly_rate:     teacher.monthlyRate,
  notes:            teacher.notes,
  active_students:  activeStudents,
});

// GET /api/teachers
exports.list = async (req, res) => {
  try {
    const users    = await User.find({ role: 'teacher' }).lean();
    const teachers = await Teacher.find({ userId: { $in: users.map(u => u._id) } }).lean();
    const teacherMap = {};
    teachers.forEach(t => { teacherMap[t.userId.toString()] = t; });

    const counts = await Assignment.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$teacherId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const result = users.map(u => {
      const t = teacherMap[u._id.toString()] || {};
      const cnt = t._id ? (countMap[t._id.toString()] || 0) : 0;
      return formatTeacher(u, t, cnt);
    });

    return ok(res, result);
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/teachers
exports.create = async (req, res) => {
  try {
    const { fullName, username, email, password, phone = null, telegramUsername = null, specialization = 'other', teachingDays = [], teachingTime = null, monthlyRate = 0 } = req.body;

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return conflict(res, 'Username already exists');

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      // Only set email if provided — avoids null duplicate key error
      ...(email ? { email: email.toLowerCase() } : {}),
      passwordHash: hash,
      role: 'teacher',
      mustChangePwd: true,
    });
    const teacher = await Teacher.create({ userId: user._id, phone, telegramUsername, specialization, teachingDays, teachingTime, monthlyRate });

    audit({ actorId: req.user.id, actorRole: 'admin', action: 'create_teacher', entityType: 'teacher', entityId: teacher._id, description: `Created teacher: ${fullName}`, ipAddress: req.ip });
    return created(res, { userId: user._id, teacherId: teacher._id }, 'Teacher created');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/teachers/:id
exports.getOne = async (req, res) => {
  try {
    const user    = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('-passwordHash');
    if (!user) return notFound(res, 'Teacher not found');
    const teacher = await Teacher.findOne({ userId: user._id });
    return ok(res, formatTeacher(user, teacher || {}));
  } catch (err) {
    return serverError(res, err.message);
  }
};

// PUT /api/teachers/:id
exports.update = async (req, res) => {
  try {
    // Teachers can only update their own profile
    if (req.user.role === 'teacher' && req.user.id !== req.params.id) return forbidden(res);

    const { fullName, email = null, phone = null, telegramUsername = null, specialization, teachingDays, teachingTime = null, monthlyRate, notes = null } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'teacher' },
      { fullName, email },
      { new: true }
    );
    if (!user) return notFound(res, 'Teacher not found');

    const teacher = await Teacher.findOneAndUpdate(
      { userId: user._id },
      { phone, telegramUsername, specialization, teachingDays, teachingTime, notes, ...(req.user.role === 'admin' ? { monthlyRate } : {}) },
      { new: true }
    );

    audit({ actorId: req.user.id, actorRole: req.user.role, action: 'update_teacher', entityType: 'teacher', entityId: teacher._id, ipAddress: req.ip });
    return ok(res, {}, 'Teacher updated');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// PATCH /api/teachers/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'teacher' }, { status });
    if (!user) return notFound(res, 'Teacher not found');
    audit({ actorId: req.user.id, actorRole: 'admin', action: 'update_teacher_status', entityType: 'teacher', entityId: req.params.id, description: `Status set to ${status}`, ipAddress: req.ip });
    return ok(res, { status }, 'Status updated');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// DELETE /api/teachers/:id
exports.remove = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'teacher' });
    if (!user) return notFound(res, 'Teacher not found');

    const teacher = await Teacher.findOne({ userId: user._id });
    if (teacher) {
      await Assignment.updateMany({ teacherId: teacher._id, status: 'active' }, { status: 'ended', endDate: new Date() });
      await teacher.deleteOne();
    }
    await user.deleteOne();

    audit({ actorId: req.user.id, actorRole: 'admin', action: 'delete_teacher', entityType: 'teacher', entityId: req.params.id, ipAddress: req.ip });
    return noContent(res);
  } catch (err) {
    return serverError(res, err.message);
  }
};
