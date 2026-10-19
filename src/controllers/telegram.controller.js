const Student    = require('../models/Student');
const Teacher    = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const audit      = require('../utils/audit');
const { ok, forbidden, serverError } = require('../utils/response');

const getBot = () => require('../services/telegram.service').getBot();

// POST /api/telegram/webhook
exports.webhook = async (req, res) => {
  try {
    const update = req.body;
    if (update.message?.text?.startsWith('/start')) {
      const chatId   = update.message.chat.id;
      const username = update.message.from?.username || null;

      if (username) {
        const student = await Student.findOne({ telegramUsername: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (student) {
          student.chatId            = String(chatId);
          student.telegramConnected = true;
          student.connectedAt       = new Date();
          await student.save();

          const bot = getBot();
          if (bot) await bot.sendMessage(chatId, `Assalamu Alaikum ${student.fullName}! ✅ You have been successfully connected to the QuranClass system. JazakAllahu Khairan.`);
        } else {
          const bot = getBot();
          if (bot) await bot.sendMessage(chatId, `Assalamu Alaikum! ❌ Your Telegram username (@${username}) is not registered. Please contact your administrator.`);
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(200);
  }
};

// GET /api/telegram/status
exports.status = async (req, res) => {
  try {
    let students;

    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) return forbidden(res);
      const assignments = await Assignment.find({ teacherId: teacher._id, status: 'active' }).populate('studentId');
      students = assignments.map(a => a.studentId).filter(Boolean);
    } else {
      students = await Student.find({ status: 'active' });
    }

    // Get teacher names for admin view
    const assignmentsAll = req.user.role === 'admin'
      ? await Assignment.find({ status: 'active' })
          .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } })
      : [];
    const teacherMap = {};
    assignmentsAll.forEach(a => { teacherMap[a.studentId?.toString()] = a.teacherId?.userId?.fullName; });

    return ok(res, students.map(s => ({
      student_id:       s._id,
      full_name:        s.fullName,
      teacher_name:     teacherMap[s._id.toString()],
      telegram_username:s.telegramUsername,
      chat_id:          s.chatId,
      connected:        s.telegramConnected,
      connected_at:     s.connectedAt,
    })));
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/telegram/connect (manual admin connect)
exports.manualConnect = async (req, res) => {
  try {
    const { studentId, chatId, telegramUsername = null } = req.body;
    const student = await Student.findByIdAndUpdate(
      studentId,
      { chatId: String(chatId), telegramConnected: true, connectedAt: new Date(), ...(telegramUsername ? { telegramUsername: telegramUsername.replace(/^@/,'') } : {}) },
      { new: true }
    );
    if (!student) return require('../utils/response').notFound(res, 'Student not found');
    audit({ actorId: req.user.id, actorRole: 'admin', action: 'manual_telegram_connect', entityType: 'student', entityId: studentId, ipAddress: req.ip });
    return ok(res, {}, 'Student connected to Telegram');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/telegram/send
exports.send = async (req, res) => {
  try {
    const { studentId, zoomLink } = req.body;

    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) return forbidden(res);
      const check = await Assignment.findOne({ studentId, teacherId: teacher._id, status: 'active' });
      if (!check) return forbidden(res);
    }

    const result = await sendZoom(studentId, zoomLink);
    audit({ actorId: req.user.id, actorRole: req.user.role, action: 'send_zoom_link', entityType: 'student', entityId: studentId, ipAddress: req.ip });
    return ok(res, result);
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/telegram/send-bulk
exports.sendBulk = async (req, res) => {
  try {
    const { studentIds, zoomLink } = req.body;

    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) return forbidden(res);
      const assigned = await Assignment.find({ studentId: { $in: studentIds }, teacherId: teacher._id, status: 'active' });
      const allowed  = assigned.map(a => a.studentId.toString());
      const blocked  = studentIds.filter(id => !allowed.includes(id.toString()));
      if (blocked.length) return forbidden(res, `Not authorized for some students`);
    }

    const results = [];
    for (const sid of studentIds) {
      const r = await sendZoom(sid, zoomLink);
      results.push({ studentId: sid, ...r });
    }

    audit({ actorId: req.user.id, actorRole: req.user.role, action: 'send_zoom_bulk', description: `Sent to ${studentIds.length} students`, ipAddress: req.ip });
    return ok(res, { results });
  } catch (err) {
    return serverError(res, err.message);
  }
};

async function sendZoom(studentId, zoomLink) {
  const student = await Student.findById(studentId);
  if (!student) return { status: 'failed', error: 'Student not found' };
  if (!student.telegramConnected || !student.chatId) return { status: 'not_connected' };

  try {
    const bot = getBot();
    if (bot) {
      await bot.sendMessage(student.chatId,
        `Assalamu Alaikum ${student.fullName},\n\nYour Quran class is ready. Join:\n\n${zoomLink}\n\nJazakAllahu Khairan.`
      );
    }
    return { status: 'sent' };
  } catch (err) {
    return { status: 'failed', error: err.message };
  }
}
