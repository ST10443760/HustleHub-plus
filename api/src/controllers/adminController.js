const User = require('../models/User');
const Transaction = require('../models/Transaction');
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

module.exports = { listUsers, listTransactions };
