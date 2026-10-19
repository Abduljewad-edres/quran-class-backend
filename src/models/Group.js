const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  teacherId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  name:         { type: String, required: true, trim: true },
  learningType: { type: String, enum: ['hifz','qaida','nethor','tajweed','recitation','other'], default: 'other' },
  teachingDays: [{ type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] }],
  teachingTime: { type: String },
  description:  { type: String },
  status:       { type: String, enum: ['active','inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
