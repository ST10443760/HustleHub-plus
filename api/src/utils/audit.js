const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

/**
 * Writes one audit log entry. Never throws: if the write fails (database
 * down, invalid entry), the failure is logged as an error event and the
 * request that triggered it carries on. The action itself has already
 * happened and must not be undone or reported as failed just because the
 * audit record couldn't be saved. Only the action name and error type are
 * logged, never the entry contents.
 *
 *   await recordAudit(req, { action: 'password_changed', targetType: 'user', targetId: user._id });
 *
 * The actor and IP come from the verified request (req.user, req.ip),
 * unless `actor` is given (the lockout, where nobody is logged in).
 * Resolves to true when the entry was written.
 */
async function recordAudit(req, entry, { model = AuditLog } = {}) {
  const actor = entry.actor || req.user;
  try {
    await model.create({
      actorId: actor.id,
      actorRole: actor.role,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      outcome: entry.outcome || 'success',
      ip: typeof req.ip === 'string' ? req.ip.slice(0, 64) : undefined,
      meta: entry.meta,
    });
    return true;
  } catch (err) {
    logger.event('ERROR', 'Audit log write failed', { action: entry.action, errorName: err.name });
    return false;
  }
}

module.exports = { recordAudit };
