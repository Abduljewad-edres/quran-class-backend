const AuditLog = require('../models/AuditLog');

const audit = async ({ actorId, actorRole, action, entityType = null, entityId = null, description = null, ipAddress = null, userAgent = null }) => {
  try {
    await AuditLog.create({ actorId, actorRole, action, entityType, entityId, description, ipAddress, userAgent });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = audit;
