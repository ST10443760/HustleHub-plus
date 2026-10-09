const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Gig = require('../models/Gig');
const Transaction = require('../models/Transaction');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const GIG_NOT_FOUND = 'Gig not found';

// POST /api/bookings - client only. The body carries just the gig id;
// price, freelancer and status come from the database, the client from
// the verified token.
async function createBooking(req, res, next) {
  const { gigId } = req.body;
  const clientId = req.user.id;

  let booking;
  let transaction;
  const session = await mongoose.startSession();

  try {
    // Booking and transaction are written in ONE database transaction:
    // either both are saved or neither is, so a booking can never exist
    // without its payment record. withTransaction retries the whole
    // callback on transient errors, so everything it needs is read inside.
    await session.withTransaction(async () => {
      const gig = await Gig.findById(gigId).session(session);
      if (!gig || !gig.isActive) {
        throw new AppError(GIG_NOT_FOUND, 404);
      }

      [booking] = await Booking.create(
        [
          {
            gig: gig._id,
            gigTitle: gig.title,
            price: gig.price,
            client: clientId,
            freelancer: gig.freelancer,
          },
        ],
        { session }
      );

      // Payment is simulated, so the transaction is completed straight away.
      [transaction] = await Transaction.create(
        [
          {
            booking: booking._id,
            gig: gig._id,
            client: booking.client,
            freelancer: booking.freelancer,
            amount: booking.price,
            status: 'completed',
          },
        ],
        { session }
      );
    });
  } catch (err) {
    logger.event('BOOKING', 'Booking failed - nothing was saved', {
      clientId,
      gigId,
      reason: err instanceof AppError ? err.message : err.name,
    });
    return next(err);
  } finally {
    await session.endSession();
  }

  logger.event('BOOKING', 'Booking created', {
    bookingId: booking.id,
    gigId,
    clientId,
    freelancerId: booking.freelancer.toString(),
    price: booking.price,
  });
  logger.event('TRANSACTION', 'Transaction created', {
    transactionId: transaction.id,
    bookingId: booking.id,
    reference: transaction.reference,
    amount: transaction.amount,
  });

  res.status(201).json({
    success: true,
    data: {
      booking: booking.toJSON(),
      transaction: transaction.toJSON(),
      payment: {
        status: 'confirmed',
        simulated: true,
        reference: transaction.reference,
        amount: transaction.amount,
        message: 'Payment confirmed (simulated - no real money was charged).',
      },
    },
  });
}

module.exports = { createBooking };
