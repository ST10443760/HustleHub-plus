const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const { roundMoney } = require('../utils/money');

// GET /api/income - freelancer only. Total and per-booking income from this
// freelancer's COMPLETED transactions (refunded ones don't count).
async function getIncome(req, res, next) {
  try {
    // aggregate() doesn't cast like find() does, so the id from the token
    // has to be turned into a real ObjectId or nothing would match.
    const freelancerId = new mongoose.Types.ObjectId(req.user.id);

    const [result] = await Transaction.aggregate([
      { $match: { freelancer: freelancerId, status: 'completed' } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          totals: [{ $group: { _id: null, totalEarned: { $sum: '$amount' }, bookingCount: { $sum: 1 } } }],
          items: [
            {
              $lookup: {
                from: Booking.collection.name,
                localField: 'booking',
                foreignField: '_id',
                as: 'booking',
              },
            },
            { $unwind: '$booking' },
            {
              $project: {
                _id: 0,
                bookingId: { $toString: '$booking._id' },
                gigTitle: '$booking.gigTitle',
                amount: 1,
                date: '$createdAt',
                reference: 1,
              },
            },
          ],
        },
      },
    ]);

    const totals = result.totals[0] || { totalEarned: 0, bookingCount: 0 };

    res.status(200).json({
      success: true,
      data: {
        totalEarned: roundMoney(totals.totalEarned),
        bookingCount: totals.bookingCount,
        items: result.items,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getIncome };
