const crypto = require('crypto');
const mongoose = require('mongoose');
const { roundMoney } = require('../utils/money');

const TRANSACTION_STATUSES = ['completed', 'refunded'];

// e.g. TXN-20261009-9F3A1C2B7D4E
function generateReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `TXN-${date}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

const transactionSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // one transaction per booking
    },
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Number, not a string, so income totals can be summed directly.
    amount: {
      type: Number,
      required: true,
      min: 0,
      set: roundMoney,
    },
    // Payment is simulated for Part 2, so a transaction is completed on creation.
    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
      default: 'completed',
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      default: generateReference,
    },
  },
  {
    timestamps: true,
    strict: 'throw',
  }
);

// "My transactions", newest first, for each side.
transactionSchema.index({ client: 1, createdAt: -1 });
// Income: one freelancer's completed transactions, newest first.
transactionSchema.index({ freelancer: 1, status: 1, createdAt: -1 });
// Admin list of all transactions, newest first.
transactionSchema.index({ createdAt: -1 });

transactionSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.TRANSACTION_STATUSES = TRANSACTION_STATUSES;
