const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacherId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  groupId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  assignmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  attendanceDate: { type: Date, required: true },
  status:         { type: String, enum: ['present','absent','permitted'], required: true },
  markedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes:          { type: String },
}, { timestamps: true });

// One record per student per date
attendanceSchema.index({ studentId: 1, attendanceDate: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
