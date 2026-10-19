const Assignment = require('../models/Assignment');
const Teacher    = require('../models/Teacher');
const audit      = require('../utils/audit');
const { ok, created, noContent, notFound, conflict, serverError } = require('../utils/response');

const fmt = (a) => ({
  id:            a._id,
  student_id:    a.studentId?._id || a.studentId,
  student_name:  a.studentId?.fullName,
  teacher_id:    a.teacherId?._id || a.teacherId,
  teacher_name:  a.teacherId?.userId?.fullName,
  group_id:      a.groupId?._id || a.groupId,
  group_name:    a.groupId?.name,
  teaching_days: Array.isArray(a.teachingDays) ? a.teachingDays.join(',') : a.teachingDays,
  teaching_time: a.teachingTime,
  effective_date:a.effectiveDate,
  end_date:      a.endDate,
  status:        a.status,
  notes:         a.notes,
});

// GET /api/assignments
exports.list = async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('studentId', 'fullName')
      .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } })
      .populate('groupId', 'name')
      .sort({ createdAt: -1 });
    return ok(res, assignments.map(fmt));
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/assignments
exports.create = async (req, res) => {
  try {
    const { studentId, teacherId, groupId = null, teachingDays, teachingTime = null, effectiveDate, notes = null } = req.body;

    const existing = await Assignment.findOne({ studentId, status: 'active' });
    if (existing) return conflict(res, 'Student already has an active assignment. Transfer instead.');

    const assignment = await Assignment.create({
      studentId, teacherId, groupId, assignedBy: req.user.id,
      teachingDays: Array.isArray(teachingDays) ? teachingDays : teachingDays?.split(','),
      teachingTime, effectiveDate, notes,
    });

    audit({ actorId: req.user.id, actorRole: 'admin', action: 'assign_student', entityType: 'assignment', entityId: assignment._id, description: `Student ${studentId} assigned to teacher ${teacherId}`, ipAddress: req.ip });
    return created(res, { id: assignment._id }, 'Student assigned');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// PUT /api/assignments/:id
exports.transfer = async (req, res) => {
  try {
    const { newTeacherId, newGroupId = null, effectiveDate, teachingDays, teachingTime = null, notes = null } = req.body;

    const old = await Assignment.findOne({ _id: req.params.id, status: 'active' });
    if (!old) return notFound(res, 'Active assignment not found');

    const days = Array.isArray(teachingDays) ? teachingDays : teachingDays?.split(',');

    // Same teacher — just update group
    if (old.teacherId.toString() === newTeacherId?.toString()) {
      old.groupId      = newGroupId;
      old.teachingDays = days;
      old.teachingTime = teachingTime;
      old.notes        = notes;
      await old.save();
      return ok(res, { assignmentId: old._id }, 'Assignment updated');
    }

    // Different teacher — transfer
    old.status  = 'transferred';
    old.endDate = effectiveDate;
    await old.save();

    const newAssignment = await Assignment.create({
      studentId: old.studentId, teacherId: newTeacherId, groupId: newGroupId,
      assignedBy: req.user.id, teachingDays: days, teachingTime,
      effectiveDate, status: 'active', notes,
    });

    audit({ actorId: req.user.id, actorRole: 'admin', action: 'transfer_student', entityType: 'assignment', entityId: newAssignment._id, description: `Student ${old.studentId} transferred`, ipAddress: req.ip });
    return ok(res, { newAssignmentId: newAssignment._id }, 'Student transferred');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// DELETE /api/assignments/:id
exports.end = async (req, res) => {
  try {
    const assignment = await Assignment.findOneAndUpdate(
      { _id: req.params.id, status: 'active' },
      { status: 'ended', endDate: new Date() }
    );
    if (!assignment) return notFound(res, 'Active assignment not found');
    audit({ actorId: req.user.id, actorRole: 'admin', action: 'end_assignment', entityType: 'assignment', entityId: req.params.id, ipAddress: req.ip });
    return noContent(res);
  } catch (err) {
    return serverError(res, err.message);
  }
};
