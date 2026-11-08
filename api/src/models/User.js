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

    // ---- Account lockout (see utils/lockout.js) ----
    // Internal only: select: false, stripped by toJSON, never in a token.
    // Accounts created before these existed simply don't have them, which
    // the lockout logic treats as "no failures".
    failedLoginAttempts: { type: Number, default: 0, min: 0, select: false },
    firstFailedLoginAt: { type: Date, default: null, select: false },
    lastFailedLoginAt: { type: Date, default: null, select: false },
    lockUntil: { type: Date, default: null, select: false },

    // ---- Session revocation ----
    // Copied into every JWT as "tv". Changing the password or "sign out of
    // all devices" increments it, so every older token stops working.
    // Missing (older accounts) counts as 0.
    tokenVersion: { type: Number, default: 0, min: 0, select: false },
  },
  {
    timestamps: true,
    strict: 'throw', // unknown fields are an error, not silently saved
  }
);

// Never part of an API response, even if a query selected them.
const PRIVATE_FIELDS = ['passwordHash', 'failedLoginAttempts', 'firstFailedLoginAt', 'lastFailedLoginAt', 'lockUntil', 'tokenVersion'];

// Safe public shape for API responses: string id, no hash, no lockout or
// session fields, no __v.
userSchema.set('toJSON', {
  transform(doc, ret) {
    const safe = { ...ret, id: ret._id.toString() };
    delete safe._id;
    delete safe.__v;
    for (const field of PRIVATE_FIELDS) Reflect.deleteProperty(safe, field);
    return safe;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
