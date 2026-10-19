const SalaryRecord = require('../models/SalaryRecord');
const Teacher      = require('../models/Teacher');
const Assignment   = require('../models/Assignment');
const User         = require('../models/User');
const audit        = require('../utils/audit');
const { ok, created, notFound, conflict, forbidden, serverError } = require('../utils/response');

// GET /api/salaries
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) return forbidden(res);
      filter.teacherId = teacher._id;
    } else if (req.query.teacherId) filter.teacherId = req.query.teacherId;
    if (req.query.status) filter.status = req.query.status;

    const records = await SalaryRecord.find(filter)
      .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } })
      .sort({ salaryMonth: -1 });

    return ok(res, records.map(r => ({
      id:              r._id,
      teacher_name:    r.teacherId?.userId?.fullName,
      salary_month:    r.salaryMonth,
      active_students: r.activeStudents,
      rate_per_student:r.ratePerStudent,
      total_salary:    r.totalSalary,
      status:          r.status,
      payment_date:    r.paymentDate,
      amount_paid:     r.amountPaid,
      payment_method:  r.paymentMethod,
    })));
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/salaries/:id
exports.getOne = async (req, res) => {
  try {
    const record = await SalaryRecord.findById(req.params.id)
      .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } });
    if (!record) return notFound(res, 'Salary record not found');

    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher || record.teacherId?._id?.toString() !== teacher._id.toString()) return forbidden(res);
    }
    return ok(res, record);
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/salaries/generate
exports.generate = async (req, res) => {
  try {
    const { month, teacherId } = req.body;
    const [yr, mo] = month.split('-').map(Number);
    const salaryMonth = new Date(yr, mo - 1, 1);
    const endOfMonth  = new Date(yr, mo, 0);

    const teacherQuery = { ...(teacherId ? { _id: teacherId } : {}) };
    const teachers     = await Teacher.find(teacherQuery).populate('userId');
    const activeUsers  = teachers.filter(t => t.userId?.status === 'active');

    const generated = [], skipped = [];

    for (const teacher of activeUsers) {
      const exists = await SalaryRecord.findOne({ teacherId: teacher._id, salaryMonth });
      if (exists) { skipped.push({ teacherId: teacher._id, reason: 'already generated' }); continue; }

      const count = await Assignment.countDocuments({ teacherId: teacher._id, status: 'active', effectiveDate: { $lte: endOfMonth } });
      const total = count * teacher.monthlyRate;

      const record = await SalaryRecord.create({
        teacherId:      teacher._id,
        salaryMonth,
        activeStudents: count,
        ratePerStudent: teacher.monthlyRate,
        totalSalary:    total,
        generatedBy:    req.user.id,
      });
      generated.push({ teacherId: teacher._id, salaryRecordId: record._id, totalSalary: total });
    }

    audit({ actorId: req.user.id, actorRole: 'admin', action: 'generate_salary', description: `Generated salaries for ${month}`, ipAddress: req.ip });
    return ok(res, { generated, skipped }, `Salary generated for ${month}`);
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/salaries/:id/pay
exports.markPaid = async (req, res) => {
  try {
    const { amountPaid, paymentDate, paymentMethod = null, referenceNo = null, notes = null } = req.body;

    const record = await SalaryRecord.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'paid', amountPaid, paymentDate, paymentMethod, referenceNo, paidBy: req.user.id },
      { new: true }
    );
    if (!record) return notFound(res, 'Pending salary record not found');

    audit({ actorId: req.user.id, actorRole: 'admin', action: 'pay_salary', entityType: 'salary', entityId: record._id, ipAddress: req.ip });
    return ok(res, {}, 'Salary marked as paid');
  } catch (err) {
    return serverError(res, err.message);
  }
};
