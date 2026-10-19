const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['student_assigned','permission_approved','permission_rejected','salary_generated','salary_paid','telegram_failure','attendance_update','announcement'], required: true },
  title:       { type: String, required: true },
  body:        { type: String },
  isRead:      { type: Boolean, default: false },
  relatedType: { type: String },
  relatedId:   { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
