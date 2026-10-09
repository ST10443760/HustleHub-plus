const mongoose = require('mongoose');
const { roundMoney } = require('../utils/money');

const BOOKING_STATUSES = ['confirmed', 'cancelled'];

const bookingSchema = new mongoose.Schema(
  {
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: true,
      index: true, // "does this gig have bookings?" check before deleting a gig
    },
    // Snapshot of the gig title at booking time, so renaming the gig later
    // doesn't change what was booked.
    gigTitle: {
      type: String,
      required: true,
      maxlength: 600, // same cap as the (HTML-escaped) gig title
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // clients listing their own bookings
    },
    // Copied from the gig at booking time, not taken from the request.
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // freelancers listing bookings on their gigs
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'confirmed',
    },
    // Snapshot of the gig price, so later price edits don't rewrite history.
    price: {
      type: Number,
      required: true,
      min: 0,
      set: roundMoney,
    },
  },
  {
    timestamps: true,
    strict: 'throw',
  }
);

bookingSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
