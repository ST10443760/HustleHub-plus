const Transaction = require('../models/Transaction');

// GET /api/transactions/mine - clients see what they paid, freelancers see
// what they were paid. Only the other party's name is included.
async function listMyTransactions(req, res, next) {
  try {
    const isClient = req.user.role === 'client';
    const filter = isClient ? { client: req.user.id } : { freelancer: req.user.id };
    const otherParty = isClient ? 'freelancer' : 'client';

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate('gig', 'title')
      .populate(otherParty, 'name');

    res.status(200).json({
      success: true,
      data: { transactions: transactions.map((t) => t.toJSON()) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyTransactions };
