const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    collectionName: String,
    recordId: mongoose.Schema.Types.ObjectId,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    ipAddress: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditLogSchema.index({ collectionName: 1, recordId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
