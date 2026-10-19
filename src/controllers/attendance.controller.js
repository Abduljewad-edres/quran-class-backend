const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const Teacher    = require('../models/Teacher');
const Student    = require('../models/Student');
const audit      = require('../utils/audit');
const { ok, forbidden, serverError } = require('../utils/response');

const getTeacher = async (userId) => Teacher.findOne({ userId });

// GET /api/attendance/today
exports.today = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    let assignments;
    if (req.user.role === 'teacher') {
      const teacher = await getTeacher(req.user.id);
      if (!teacher) return forbidden(res);
      assignments = await Assignment.find({ teacherId: teacher._id, status: 'active' }).populate('studentId', 'fullName status');
    } else {
      assignments = await Assignment.find({ status: 'active' })
        .populate('studentId', 'fullName status')
        .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } });
    }

    const todayRecords = await Attendance.find({ attendanceDate: { $gte: today, $lt: tomorrow } });
    const attMap = {};
    todayRecords.forEach(a => { attMap[a.studentId.toString()] = a.status; });

    const students = assignments
      .filter(a => a.studentId?.status === 'active')
      .map(a => ({
        student_id:        a.studentId._id,
        full_name:         a.studentId.fullName,
        teacher_name:      a.teacherId?.userId?.fullName,
        attendance_status: attMap[a.studentId._id.toString()] || null,
      }));

    return ok(res, { date: today.toISOString().slice(0, 10), students });
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/attendance (batch submit)
exports.submit = async (req, res) => {
  try {
    const { records, attendanceDate } = req.body;
    const date = new Date(attendanceDate);
    date.setHours(0, 0, 0, 0);

    let teacherId = null;
    if (req.user.role === 'teacher') {
      const teacher = await getTeacher(req.user.id);
      if (!teacher) return forbidden(res);
      teacherId = teacher._id;
    }

    const inserted = [], skipped = [];

    for (const record of records) {
      const { studentId, status, notes = null } = record;
      const query = { studentId, status: 'active', ...(teacherId ? { teacherId } : {}) };
      const sa    = await Assignment.findOne(query);
      if (!sa) { skipped.push({ studentId, reason: 'no active assignment' }); continue; }

      try {
        await Attendance.findOneAndUpdate(
          { studentId, attendanceDate: date },
          { studentId, teacherId: sa.teacherId, groupId: sa.groupId, assignmentId: sa._id, attendanceDate: date, status, markedBy: req.user.id, notes },
          { upsert: true, new: true }
        );
        inserted.push(studentId);
      } catch (e) {
        skipped.push({ studentId, reason: e.message });
      }
    }

    audit({ actorId: req.user.id, actorRole: req.user.role, action: 'submit_attendance', description: `Submitted ${inserted.length} records for ${attendanceDate}`, ipAddress: req.ip });
    return ok(res, { inserted, skipped });
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/attendance
exports.list = async (req, res) => {
  try {
    const { date, teacherId, studentId, groupId } = req.query;
    const filter = {};

    if (req.user.role === 'teacher') {
      const teacher = await getTeacher(req.user.id);
      if (!teacher) return forbidden(res);
      filter.teacherId = teacher._id;
    } else if (teacherId) filter.teacherId = teacherId;

    if (date) { const d = new Date(date); d.setHours(0,0,0,0); const n = new Date(d); n.setDate(n.getDate()+1); filter.attendanceDate = { $gte: d, $lt: n }; }
    if (studentId) filter.studentId = studentId;
    if (groupId)   filter.groupId   = groupId;

    const records = await Attendance.find(filter)
      .populate('studentId', 'fullName')
      .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } })
      .sort({ attendanceDate: -1 })
      .limit(500);

    return ok(res, records.map(r => ({
      id:              r._id,
      student_name:    r.studentId?.fullName,
      teacher_name:    r.teacherId?.userId?.fullName,
      attendance_date: r.attendanceDate,
      status:          r.status,
    })));
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/attendance/history
exports.history = async (req, res) => {
  try {
    const { startDate, endDate, studentId, teacherId: qTeacherId } = req.query;
    const filter = {};

    if (req.user.role === 'teacher') {
      const teacher = await getTeacher(req.user.id);
      if (!teacher) return forbidden(res);
      filter.teacherId = teacher._id;
    } else if (qTeacherId) filter.teacherId = qTeacherId;

    if (studentId)  filter.studentId = studentId;
    if (startDate)  filter.attendanceDate = { ...filter.attendanceDate, $gte: new Date(startDate) };
    if (endDate)    filter.attendanceDate = { ...filter.attendanceDate, $lte: new Date(endDate) };

    const agg = await Attendance.aggregate([
      { $match: filter },
      { $group: {
        _id:            '$studentId',
        present_count:  { $sum: { $cond: [{ $eq: ['$status','present'] }, 1, 0] } },
        absent_count:   { $sum: { $cond: [{ $eq: ['$status','absent'] }, 1, 0] } },
        permitted_count:{ $sum: { $cond: [{ $eq: ['$status','permitted'] }, 1, 0] } },
        total_sessions: { $sum: 1 },
      }},
      { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
    ]);

    return ok(res, agg.map(r => ({
      student_id:      r._id,
      full_name:       r.student.fullName,
      present_count:   r.present_count,
      absent_count:    r.absent_count,
      permitted_count: r.permitted_count,
      total_sessions:  r.total_sessions,
      attendance_rate: r.total_sessions > 0 ? Math.round((r.present_count / r.total_sessions) * 1000) / 10 : 0,
    })));
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/attendance/reports
exports.reports = async (req, res) => {
  try {
    const { month } = req.query;
    const filter = {};

    if (month) {
      const [yr, mo] = month.split('-').map(Number);
      filter.attendanceDate = { $gte: new Date(yr, mo - 1, 1), $lt: new Date(yr, mo, 1) };
    }

    if (req.user.role === 'teacher') {
      const teacher = await getTeacher(req.user.id);
      if (!teacher) return forbidden(res);
      filter.teacherId = teacher._id;
    }

    const agg = await Attendance.aggregate([
      { $match: filter },
      { $group: {
        _id:           '$teacherId',
        total_students:{ $addToSet: '$studentId' },
        total_present: { $sum: { $cond: [{ $eq: ['$status','present'] }, 1, 0] } },
        total_absent:  { $sum: { $cond: [{ $eq: ['$status','absent'] }, 1, 0] } },
        total:         { $sum: 1 },
      }},
      { $lookup: { from: 'teachers', localField: '_id', foreignField: '_id', as: 'teacher' } },
      { $unwind: '$teacher' },
      { $lookup: { from: 'users', localField: 'teacher.userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
    ]);

    return ok(res, agg.map(r => ({
      teacher_id:       r._id,
      teacher_name:     r.user.fullName,
      total_students:   r.total_students.length,
      total_present:    r.total_present,
      total_absent:     r.total_absent,
      attendance_rate:  r.total > 0 ? Math.round((r.total_present / r.total) * 1000) / 10 : 0,
    })));
  } catch (err) {
    return serverError(res, err.message);
  }
};
