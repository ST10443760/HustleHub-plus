const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const { roundMoney } = require('../utils/money');
const { getTaxYearRange, SA_UTC_OFFSET } = require('../utils/taxYear');
const { defaultTaxYear, buildTaxEstimate } = require('../utils/taxEstimate');
const logger = require('../utils/logger');

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

// GET /api/income/tax-estimate?taxYear=2026 - freelancer only. Estimated
// SA income tax on this freelancer's completed transactions in one tax
// year, with a monthly breakdown. The freelancer always comes from the
// verified token, never from the request.
async function getTaxEstimate(req, res, next) {
  try {
    const startYear = req.query.taxYear ?? defaultTaxYear();
    const range = getTaxYearRange(startYear);
    const freelancerId = new mongoose.Types.ObjectId(req.user.id);

    // Uses the { freelancer, status, createdAt } index. Amounts are summed
    // as whole cents so no floating point error builds up across bookings,
    // and months are bucketed in SA time to match the tax year boundaries.
    const rows = await Transaction.aggregate([
      {
        $match: {
          freelancer: freelancerId,
          status: 'completed',
          createdAt: { $gte: range.startUtc, $lt: range.endUtc },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: SA_UTC_OFFSET } },
          incomeCents: { $sum: { $round: [{ $multiply: ['$amount', 100] }, 0] } },
          bookings: { $sum: 1 },
        },
      },
      { $project: { _id: 0, month: '$_id', incomeCents: 1, bookings: 1 } },
    ]);

    logger.event('INCOME', 'Tax estimate requested', { userId: req.user.id, taxYear: startYear });

    res.status(200).json({ success: true, data: buildTaxEstimate(startYear, rows) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getIncome, getTaxEstimate };
