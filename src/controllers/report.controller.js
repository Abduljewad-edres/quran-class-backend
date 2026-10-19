const User         = require('../models/User');
const Teacher      = require('../models/Teacher');
const Student      = require('../models/Student');
const Group        = require('../models/Group');
const Assignment   = require('../models/Assignment');
const Attendance   = require('../models/Attendance');
const SalaryRecord = require('../models/SalaryRecord');
const Permission   = require('../models/Permission');
const { ok, serverError } = require('../utils/response');

// GET /api/reports/dashboard
exports.dashboard = async (req, res) => {
  try {
    const today     = new Date(); today.setHours(0,0,0,0);
    const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

    const [totalTeachers, totalStudents, activeGroups, todayAtt, pendingPermissions, pendingSalary] = await Promise.all([
      User.countDocuments({ role: 'teacher', status: 'active' }),
      Student.countDocuments({ status: 'active' }),
      Group.countDocuments({ status: 'active' }),
      Attendance.aggregate([
        { $match: { attendanceDate: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Permission.countDocuments({ status: 'pending' }),
      SalaryRecord.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, total: { $sum: '$totalSalary' } } }]),
    ]);

    const attMap    = {};
    todayAtt.forEach(a => { attMap[a._id] = a.count; });

    return ok(res, {
      totalTeachers,
      totalStudents,
      activeGroups,
      presentToday:       attMap['present']   || 0,
      absentToday:        attMap['absent']    || 0,
      pendingPermissions,
      pendingSalary:      pendingSalary[0]?.total || 0,
    });
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/reports/teachers
exports.teachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().populate({ path: 'userId', match: { status: 'active' }, select: 'fullName status' });
    const result   = await Promise.all(
      teachers.filter(t => t.userId).map(async t => {
        const activeStudents = await Assignment.countDocuments({ teacherId: t._id, status: 'active' });
        const groupCount     = await Group.countDocuments({ teacherId: t._id, status: 'active' });
        const now   = new Date();
        const month = new Date(now.getFullYear(), now.getMonth(), 1);
        const sal   = await SalaryRecord.findOne({ teacherId: t._id, salaryMonth: month });
        return {
          full_name:            t.userId.fullName,
          status:               t.userId.status,
          specialization:       t.specialization,
          monthly_rate:         t.monthlyRate,
          active_students:      activeStudents,
          group_count:          groupCount,
          current_month_salary: sal?.totalSalary,
          salary_status:        sal?.status,
        };
      })
    );
    return ok(res, result);
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/reports/students
exports.students = async (req, res) => {
  try {
    const students = await Student.find();
    const result   = await Promise.all(students.map(async s => {
      const asgn = await Assignment.findOne({ studentId: s._id, status: 'active' })
        .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } })
        .populate('groupId', 'name');
      const now  = new Date();
      const att  = await Attendance.aggregate([
        { $match: { studentId: s._id, attendanceDate: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } } },
        { $group: { _id: null, present: { $sum: { $cond: [{ $eq: ['$status','present'] },1,0] } }, total: { $sum: 1 } } },
      ]);
      const rate = att[0]?.total > 0 ? Math.round((att[0].present / att[0].total) * 1000) / 10 : null;
      return {
        full_name:          s.fullName,
        learning_type:      s.learningType,
        status:             s.status,
        teacher_name:       asgn?.teacherId?.userId?.fullName,
        group_name:         asgn?.groupId?.name,
        telegram_connected: s.telegramConnected,
        attendance_rate:    rate,
      };
    }));
    return ok(res, result);
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/reports/attendance?month=YYYY-MM
exports.attendance = async (req, res) => {
  try {
    const { month, teacherId, groupId } = req.query;
    const filter = {};
    if (month) {
      const [yr, mo] = month.split('-').map(Number);
      filter.attendanceDate = { $gte: new Date(yr, mo-1, 1), $lt: new Date(yr, mo, 1) };
    }
    if (teacherId) filter.teacherId = teacherId;
    if (groupId)   filter.groupId   = groupId;

    const records = await Attendance.find(filter)
      .populate('studentId', 'fullName')
      .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } })
      .populate('groupId', 'name')
      .sort({ attendanceDate: -1 })
      .limit(1000);

    return ok(res, records.map(r => ({
      attendance_date: r.attendanceDate,
      student_name:    r.studentId?.fullName,
      teacher_name:    r.teacherId?.userId?.fullName,
      group_name:      r.groupId?.name,
      status:          r.status,
    })));
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/reports/salary?month=YYYY-MM
exports.salary = async (req, res) => {
  try {
    const { month } = req.query;
    const filter = {};
    if (month) {
      const [yr, mo] = month.split('-').map(Number);
      filter.salaryMonth = new Date(yr, mo-1, 1);
    }

    const records = await SalaryRecord.find(filter)
      .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } })
      .sort({ salaryMonth: -1 });

    return ok(res, records.map(r => ({
      salary_month:     r.salaryMonth,
      teacher_name:     r.teacherId?.userId?.fullName,
      active_students:  r.activeStudents,
      rate_per_student: r.ratePerStudent,
      total_salary:     r.totalSalary,
      status:           r.status,
      payment_date:     r.paymentDate,
      amount_paid:      r.amountPaid,
      payment_method:   r.paymentMethod,
    })));
  } catch (err) {
    return serverError(res, err.message);
  }
};
