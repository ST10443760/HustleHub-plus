const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Gig = require('../models/Gig');
const { AppError } = require('../middleware/errorHandler');
const { removeOrDeactivateGig } = require('../utils/gigRemoval');
const logger = require('../utils/logger');

// GET /api/admin/users - every user, newest first. passwordHash is
// select: false on the model and stripped again by toJSON.
async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    logger.event('ADMIN', 'Listed all users', { adminId: req.user.id, count: users.length });

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

    logger.event('ADMIN', 'Listed all transactions', { adminId: req.user.id, page, limit });

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

    logger.event('ADMIN', result.deleted ? 'Admin deleted a gig' : 'Admin deactivated a gig - it has bookings', {
      adminId: req.user.id,
      gigId: result.id,
      freelancerId: gig.freelancer.toString(),
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, listTransactions, deleteAnyGig };
