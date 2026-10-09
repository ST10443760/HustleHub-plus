const Booking = require('../models/Booking');

const DEACTIVATED_MESSAGE =
  'This gig has bookings, so it was deactivated instead of deleted to keep the booking history.';

/**
 * The one rule for removing a gig, shared by the owner's delete and the
 * admin's delete so the two can't drift apart:
 *   - no bookings  -> the gig is deleted
 *   - has bookings -> the gig is deactivated instead, so bookings and
 *                     transactions keep a valid reference
 *
 * Returns the response data; the caller does the logging.
 */
async function removeOrDeactivateGig(gig) {
  const hasBookings = await Booking.exists({ gig: gig._id });

  if (hasBookings) {
    if (gig.isActive) {
      gig.isActive = false;
      await gig.save();
    }
    return { id: gig.id, deleted: false, deactivated: true, message: DEACTIVATED_MESSAGE };
  }

  await gig.deleteOne();
  return { id: gig.id, deleted: true, deactivated: false };
}

module.exports = { removeOrDeactivateGig };
