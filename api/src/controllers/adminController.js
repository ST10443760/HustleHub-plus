const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Gig = require('../models/Gig');
const AuditLog = require('../models/AuditLog');
const { recordAudit } = require('../utils/audit');
const { AppError } = require('../middleware/errorHandler');
const { removeOrDeactivateGig } = require('../utils/gigRemoval');
const logger = require('../utils/logger');

// GET /api/admin/users - every user, newest first. passwordHash is
// select: false on the model and stripped again by toJSON.
async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    logger.event('ADMIN_ACTION', 'Listed all users', { action: 'list_users', count: users.length });

    res.status(200).json({
      success: true,
      data: { users: users.map((u) => u.toJSON()) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/transactions - every transaction, newest first, paginated.
// Parties are shown by name only.
async function listTransactions(req, res, next) {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;

    const [transactions, total] = await Promise.all([
      Transaction.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('gig', 'title')
        .populate('client', 'name')
        .populate('freelancer', 'name'),
      Transaction.countDocuments(),
    ]);

    logger.event('ADMIN_ACTION', 'Listed all transactions', { action: 'list_transactions', page, limit });

    res.status(200).json({
      success: true,
      data: { transactions: transactions.map((t) => t.toJSON()), page, limit, total },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/gigs/:id - remove any gig (e.g. one breaking the rules).
// Same rule as the owner's delete: deactivated instead if it has bookings.
async function deleteAnyGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      throw new AppError('Gig not found', 404);
    }

    const result = await removeOrDeactivateGig(gig);

    logger.event('ADMIN_ACTION', result.deleted ? 'Admin deleted a gig' : 'Admin deactivated a gig - it has bookings', {
      action: result.deleted ? 'gig_deleted' : 'gig_deactivated',
      gigId: result.id,
      freelancerId: gig.freelancer.toString(),
    });
    // The gig removal doesn't use a database transaction, so the audit entry
    // is written right after it succeeds. A failed audit write is logged and
    // never undoes or fails the removal (see utils/audit.js).
    await recordAudit(req, {
      action: result.deleted ? 'admin_gig_deleted' : 'admin_gig_deactivated',
      targetType: 'gig',
      targetId: gig._id,
      meta: { hadBookings: !result.deleted },
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/audit-logs - the audit log, newest first, paginated like
// the transactions list, optionally for one action. Actors are shown by
// name and role only. There is deliberately no route to change or delete
// an entry.
async function listAuditLogs(req, res, next) {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const filter = req.query.action ? { action: req.query.action } : {};

    const [entries, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actorId', 'name'),
      AuditLog.countDocuments(filter),
    ]);

    logger.event('ADMIN_ACTION', 'Viewed the audit log', { action: 'view_audit_log', page, limit, filter: req.query.action });

    const logs = entries.map((entry) => {
      const { actorId, ...rest } = entry.toJSON();
      // The populated user has already been through the User model's toJSON
      // (id, no _id). A deleted user leaves actorId null.
      const actor = actorId && typeof actorId === 'object' && actorId.name !== undefined ? { id: actorId.id, name: actorId.name } : null;
      return { ...rest, actor };
    });

    res.status(200).json({ success: true, data: { logs, page, limit, total } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, listTransactions, deleteAnyGig, listAuditLogs };
