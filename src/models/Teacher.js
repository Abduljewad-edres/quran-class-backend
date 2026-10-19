const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  phone:            { type: String },
  telegramUsername: { type: String },
  specialization:   { type: String, enum: ['hifz','qaida','nethor','tajweed','recitation','other'], default: 'other' },
  teachingDays:     [{ type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] }],
  teachingTime:     { type: String },
  monthlyRate:      { type: Number, default: 0 },
  notes:            { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);
