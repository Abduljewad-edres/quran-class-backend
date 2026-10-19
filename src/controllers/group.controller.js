const Group      = require('../models/Group');
const Teacher    = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const audit      = require('../utils/audit');
const { ok, created, noContent, notFound, forbidden, serverError } = require('../utils/response');

// GET /api/groups
exports.list = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) return forbidden(res);
      query.teacherId = teacher._id;
    }

    const groups = await Group.find(query).populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } });

    const counts = await Assignment.aggregate([
      { $match: { status: 'active', groupId: { $in: groups.map(g => g._id) } } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });

    return ok(res, groups.map(g => ({
      id:            g._id,
      teacher_id:    g.teacherId?._id,
      teacher_name:  g.teacherId?.userId?.fullName,
      name:          g.name,
      learning_type: g.learningType,
      teaching_days: g.teachingDays?.join(','),
      teaching_time: g.teachingTime,
      description:   g.description,
      status:        g.status,
      student_count: countMap[g._id.toString()] || 0,
    })));
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/groups
exports.create = async (req, res) => {
  try {
    const { teacherId, name, learningType, teachingDays, teachingTime = null, description = null } = req.body;
    const group = await Group.create({
      teacherId, name, learningType,
      teachingDays: Array.isArray(teachingDays) ? teachingDays : teachingDays?.split(','),
      teachingTime, description,
    });
    audit({ actorId: req.user.id, actorRole: 'admin', action: 'create_group', entityType: 'group', entityId: group._id, ipAddress: req.ip });
    return created(res, { id: group._id }, 'Group created');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/groups/:id
exports.getOne = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } });
    if (!group) return notFound(res, 'Group not found');

    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher || group.teacherId?._id?.toString() !== teacher._id.toString()) return forbidden(res);
    }

    const assignments = await Assignment.find({ groupId: group._id, status: 'active' }).populate('studentId', 'fullName status');
    const students    = assignments.map(a => ({
      id:            a.studentId?._id,
      full_name:     a.studentId?.fullName,
      status:        a.studentId?.status,
      teaching_days: a.teachingDays?.join(','),
      teaching_time: a.teachingTime,
    }));

    return ok(res, { id: group._id, teacher_id: group.teacherId?._id, teacher_name: group.teacherId?.userId?.fullName, name: group.name, learning_type: group.learningType, teaching_days: group.teachingDays?.join(','), teaching_time: group.teachingTime, status: group.status, students });
  } catch (err) {
    return serverError(res, err.message);
  }
};

// PUT /api/groups/:id
exports.update = async (req, res) => {
  try {
    const { name, learningType, teachingDays, teachingTime, description, status } = req.body;
    const group = await Group.findByIdAndUpdate(req.params.id, {
      name, learningType, teachingDays: Array.isArray(teachingDays) ? teachingDays : teachingDays?.split(','),
      teachingTime, description, status,
    }, { new: true });
    if (!group) return notFound(res, 'Group not found');
    return ok(res, {}, 'Group updated');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// DELETE /api/groups/:id
exports.remove = async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(req.params.id, { status: 'inactive' });
    if (!group) return notFound(res, 'Group not found');
    return noContent(res);
  } catch (err) {
    return serverError(res, err.message);
  }
};
