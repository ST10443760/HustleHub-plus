const mongoose = require('mongoose');

const ROLES = ['client', 'freelancer', 'admin'];

const userSchema = new mongoose.Schema(
  {
    // The name is HTML-escaped before it's saved (& becomes &amp; and so on),
    // which can make it longer. The 60-character limit applies to what the
    // user types and is enforced in the validators; this cap leaves room
    // for the escaped form.
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 360,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // also creates the email index used by every login lookup
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // select: false - the hash never comes back from a query unless a
    // controller explicitly asks for it with .select('+passwordHash').
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'client',
    },
  },
  {
    timestamps: true,
    strict: 'throw', // unknown fields are an error, not silently saved
  }
);

// Safe public shape for API responses: string id, no hash, no __v.
userSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
