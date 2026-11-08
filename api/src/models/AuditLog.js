const mongoose = require('mongoose');

/**
 * Append-only record of security-relevant actions, for admins to review.
 *
 * Holds only who did what to what, from where, and whether it worked.
 * Never passwords, tokens, emails or request bodies: `meta` is a small
 * whitelisted object (strict schema, unknown keys throw).
 *
 * Append-only is enforced twice: there is no route that updates or deletes
 * entries, and every Mongoose update, replace and delete operation on this
 * model throws before it reaches the database.
 */

const AUDIT_ACTIONS = Object.freeze([
  'admin_gig_deleted',
  'admin_gig_deactivated',
  'password_changed',
  'logout_all',
  'account_locked',
]);
const TARGET_TYPES = Object.freeze(['gig', 'user']);
const OUTCOMES = Object.freeze(['success', 'failure']);
const ROLES = Object.freeze(['client', 'freelancer', 'admin']);

const metaSchema = new mongoose.Schema(
  {
    failedAttempts: { type: Number, min: 0 }, // account_locked
    lockMinutes: { type: Number, min: 0 }, // account_locked
    hadBookings: { type: Boolean }, // admin gig removal
  },
  { _id: false, strict: 'throw' }
);

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, enum: ROLES, required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    targetType: { type: String, enum: TARGET_TYPES, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    outcome: { type: String, enum: OUTCOMES, default: 'success' },
    ip: { type: String, maxlength: 64 },
    meta: { type: metaSchema, default: undefined },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: 'throw',
  }
);

// Newest first, and newest first for one action (the admin filter).
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const APPEND_ONLY = 'Audit log entries are append-only and cannot be changed or deleted';

function refuse() {
  throw new Error(APPEND_ONLY);
}

// Query operations that would change or remove existing entries.
auditLogSchema.pre(
  [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
    'findOneAndReplace',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
  ],
  { document: false, query: true },
  refuse
);

// doc.deleteOne() and doc.updateOne() on a loaded entry.
auditLogSchema.pre(['deleteOne', 'updateOne'], { document: true, query: false }, refuse);

// save() is only allowed for a brand-new entry.
auditLogSchema.pre('save', function onlyNew() {
  if (!this.isNew) refuse();
});

// bulkWrite could contain updates or deletes.
auditLogSchema.pre('bulkWrite', refuse);

auditLogSchema.set('toJSON', {
  transform(doc, ret) {
    const safe = { ...ret, id: ret._id.toString() };
    delete safe._id;
    delete safe.__v;
    return safe;
  },
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
module.exports.APPEND_ONLY = APPEND_ONLY;
