const mongoose = require('mongoose');

const BOOKING_STATUSES = ['confirmed', 'cancelled'];

const bookingSchema = new mongoose.Schema(
  {
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: true,
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
    priceAtBooking: {
      type: Number,
      required: true,
      min: 0,
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
