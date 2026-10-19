const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacherId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  groupId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  assignedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teachingDays: [{ type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] }],
  teachingTime: { type: String },
  effectiveDate:{ type: Date, required: true },
  endDate:      { type: Date },
  status:       { type: String, enum: ['active','transferred','ended'], default: 'active' },
  notes:        { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
