const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  fullName:         { type: String, required: true, trim: true },
  phone:            { type: String },
  guardianName:     { type: String },
  guardianPhone:    { type: String },
  learningType:     { type: String, enum: ['hifz','qaida','nethor','tajweed','recitation','other'], default: 'other' },
  status:           { type: String, enum: ['active','inactive','transferred','dropped'], default: 'active' },
  telegramUsername: { type: String },
  chatId:           { type: String },
  telegramConnected:{ type: Boolean, default: false },
  connectedAt:      { type: Date },
  notes:            { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
