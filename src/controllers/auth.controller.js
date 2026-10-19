const bcrypt        = require('bcrypt');
const User          = require('../models/User');
const Teacher       = require('../models/Teacher');
const { signToken } = require('../config/jwt');
const audit         = require('../utils/audit');
const { ok, unauthorized, serverError } = require('../utils/response');

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
    });

    if (!user) return unauthorized(res, 'Invalid credentials');
    if (user.status !== 'active') return unauthorized(res, 'Account is inactive');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return unauthorized(res, 'Invalid credentials');

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken({ id: user._id, role: user.role, username: user.username });

    audit({ actorId: user._id, actorRole: user.role, action: 'login', entityType: 'user', entityId: user._id, ipAddress: req.ip });

    return ok(res, {
      token,
      user: {
        id:            user._id,
        fullName:      user.fullName,
        username:      user.username,
        role:          user.role,
        mustChangePwd: user.mustChangePwd,
      },
    }, 'Login successful');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  audit({ actorId: req.user.id, actorRole: req.user.role, action: 'logout', ipAddress: req.ip });
  return ok(res, {}, 'Logged out');
};

// POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return unauthorized(res);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return unauthorized(res, 'Current password is incorrect');

    user.passwordHash  = await bcrypt.hash(newPassword, 12);
    user.mustChangePwd = false;
    await user.save();

    audit({ actorId: user._id, actorRole: user.role, action: 'change_password', ipAddress: req.ip });
    return ok(res, {}, 'Password changed successfully');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const user    = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return unauthorized(res);
    const teacher = await Teacher.findOne({ userId: user._id });
    return ok(res, { ...user.toObject(), ...( teacher ? teacher.toObject() : {}) });
  } catch (err) {
    return serverError(res, err.message);
  }
};
