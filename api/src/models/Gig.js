const mongoose = require('mongoose');

// Shared with the validators so the allowed list lives in one place.
const GIG_CATEGORIES = ['design', 'writing', 'development', 'marketing', 'video', 'other'];

const gigSchema = new mongoose.Schema(
  {
    // Text is HTML-escaped by the validators before it gets here, and
    // escaping can make it longer (& becomes &amp;, ' becomes &#x27;).
    // The user-facing limits (100 / 1000 characters) are enforced in the
    // validators; these caps leave room for the escaped form.
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: 3,
      maxlength: 600,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: 10,
      maxlength: 6000,
    },
    // Stored as a plain Number so totals and income stats are easy to
    // aggregate later.
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be at least 1'],
      max: 100000,
    },
    deliveryDays: {
      type: Number,
      required: [true, 'Delivery time is required'],
      min: 1,
      max: 90,
      validate: {
        validator: Number.isInteger,
        message: 'Delivery days must be a whole number',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: GIG_CATEGORIES,
    },
    // Always set from the authenticated user, never from the request body.
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // "my gigs" and ownership lookups
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    strict: 'throw',
  }
);

gigSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Gig', gigSchema);
module.exports.GIG_CATEGORIES = GIG_CATEGORIES;
