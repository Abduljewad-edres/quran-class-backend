const Permission     = require('../models/Permission');
const Notification   = require('../models/Notification');
const Teacher        = require('../models/Teacher');
const User           = require('../models/User');
const audit          = require('../utils/audit');
const { ok, created, notFound, forbidden, serverError } = require('../utils/response');

const notify = async (userId, type, title, body, relatedId) => {
  try { await Notification.create({ userId, type, title, body, relatedType: 'permission', relatedId }); } catch (_) {}
};

// GET /api/permissions
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) return forbidden(res);
      filter.teacherId = teacher._id;
    } else if (req.query.teacherId) filter.teacherId = req.query.teacherId;
    if (req.query.status) filter.status = req.query.status;

    const perms = await Permission.find(filter)
      .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } })
      .populate('reviewedBy', 'fullName')
      .sort({ createdAt: -1 });

    return ok(res, perms.map(p => ({
      id:               p._id,
      teacher_name:     p.teacherId?.userId?.fullName,
      type:             p.type,
      request_date:     p.requestDate,
      reason:           p.reason,
      status:           p.status,
      review_notes:     p.reviewNotes,
      reviewed_by_name: p.reviewedBy?.fullName,
      reviewed_at:      p.reviewedAt,
    })));
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/permissions
exports.create = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) return forbidden(res);

    const { type, requestDate, reason } = req.body;
    const perm = await Permission.create({ teacherId: teacher._id, type, requestDate, reason });

    const admins = await User.find({ role: 'admin', status: 'active' });
    for (const admin of admins) {
      await notify(admin._id, 'announcement', 'New Permission Request', `A teacher submitted a ${type} request`, perm._id);
    }

    audit({ actorId: req.user.id, actorRole: 'teacher', action: 'submit_permission', entityType: 'permission', entityId: perm._id, ipAddress: req.ip });
    return created(res, { id: perm._id }, 'Permission request submitted');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// PATCH /api/permissions/:id/approve
exports.approve = async (req, res) => {
  try {
    const { reviewNotes = null } = req.body;
    const perm = await Permission.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'approved', reviewedBy: req.user.id, reviewedAt: new Date(), reviewNotes },
      { new: true }
    ).populate({ path: 'teacherId', populate: { path: 'userId' } });

    if (!perm) return notFound(res, 'Pending permission not found');

    await notify(perm.teacherId?.userId?._id, 'permission_approved', 'Permission Approved', `Your ${perm.type} request was approved.`, perm._id);
    audit({ actorId: req.user.id, actorRole: 'admin', action: 'approve_permission', entityType: 'permission', entityId: perm._id, ipAddress: req.ip });
    return ok(res, {}, 'Permission approved');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// PATCH /api/permissions/:id/reject
exports.reject = async (req, res) => {
  try {
    const { reviewNotes = null } = req.body;
    const perm = await Permission.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'rejected', reviewedBy: req.user.id, reviewedAt: new Date(), reviewNotes },
      { new: true }
    ).populate({ path: 'teacherId', populate: { path: 'userId' } });

    if (!perm) return notFound(res, 'Pending permission not found');

    await notify(perm.teacherId?.userId?._id, 'permission_rejected', 'Permission Rejected', `Your ${perm.type} request was rejected.`, perm._id);
    audit({ actorId: req.user.id, actorRole: 'admin', action: 'reject_permission', entityType: 'permission', entityId: perm._id, ipAddress: req.ip });
    return ok(res, {}, 'Permission rejected');
  } catch (err) {
    return serverError(res, err.message);
  }
};
