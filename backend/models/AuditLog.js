import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: { type: String, required: true },
  role: { type: String, default: 'User' },
  action: { type: String, required: true },
  targetEntity: { type: String, default: '' },
  details: { type: String, default: '' },
  ipAddress: { type: String, default: '127.0.0.1' },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
