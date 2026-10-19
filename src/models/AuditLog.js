const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole:   { type: String, enum: ['admin','teacher','system'] },
  action:      { type: String, required: true },
  entityType:  { type: String },
  entityId:    { type: mongoose.Schema.Types.ObjectId },
  description: { type: String },
  ipAddress:   { type: String },
  userAgent:   { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
