const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName:      { type: String, required: true, trim: true },
  username:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  email:         { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash:  { type: String, required: true },
  role:          { type: String, enum: ['admin', 'teacher'], required: true },
  status:        { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  mustChangePwd: { type: Boolean, default: true },
  lastLoginAt:   { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
