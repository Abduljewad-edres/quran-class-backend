const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  type:        { type: String, enum: ['leave','schedule_change','class_cancellation','student_issue','emergency','other'], required: true },
  requestDate: { type: Date, required: true },
  reason:      { type: String, required: true },
  status:      { type: String, enum: ['pending','approved','rejected','cancelled'], default: 'pending' },
  reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:  { type: Date },
  reviewNotes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Permission', permissionSchema);
