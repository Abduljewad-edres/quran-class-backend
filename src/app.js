const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes         = require('./routes/auth.routes');
const teacherRoutes      = require('./routes/teacher.routes');
const studentRoutes      = require('./routes/student.routes');
const assignmentRoutes   = require('./routes/assignment.routes');
const groupRoutes        = require('./routes/group.routes');
const attendanceRoutes   = require('./routes/attendance.routes');
const salaryRoutes       = require('./routes/salary.routes');
const permissionRoutes   = require('./routes/permission.routes');
const telegramRoutes     = require('./routes/telegram.routes');
const notificationRoutes = require('./routes/notification.routes');
const reportRoutes       = require('./routes/report.routes');
const settingsRoutes     = require('./routes/settings.routes');

const app = express();

// ── Security ──────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    // In development allow all
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────
// Rate limiting — login only in development
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      process.env.NODE_ENV === 'production' ? 20 : 200,
  message:  { success: false, message: 'Too many login attempts. Try again later.' },
}));

// General API rate limit — production only
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', rateLimit({
    windowMs: 60 * 1000,
    max:      200,
  }));
}

// ── Parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/teachers',      teacherRoutes);
app.use('/api/students',      studentRoutes);
app.use('/api/assignments',   assignmentRoutes);
app.use('/api/groups',        groupRoutes);
app.use('/api/attendance',    attendanceRoutes);
app.use('/api/salaries',      salaryRoutes);
app.use('/api/permissions',   permissionRoutes);
app.use('/api/telegram',      telegramRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/settings',      settingsRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Global error handler ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
