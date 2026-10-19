const Notification = require('../models/Notification');
const { ok, serverError } = require('../utils/response');

// POST /api/notifications/send
exports.send = async (req, res) => {
  try {
    const { userId, title, body = null } = req.body;
    await Notification.create({ userId, type: 'announcement', title, body });
    return ok(res, {}, 'Notification sent');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// GET /api/notifications
exports.list = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 }).limit(50);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return ok(res, { notifications: notifications.map(n => ({ ...n.toObject(), is_read: n.isRead, created_at: n.createdAt })), unreadCount });
  } catch (err) {
    return serverError(res, err.message);
  }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: true });
    return ok(res, {}, 'Marked as read');
  } catch (err) {
    return serverError(res, err.message);
  }
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    return ok(res, {}, 'All notifications marked as read');
  } catch (err) {
    return serverError(res, err.message);
  }
};
