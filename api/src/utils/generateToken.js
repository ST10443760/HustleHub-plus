const jwt = require('jsonwebtoken');

/**
 * Issues a JWT for a given user. Payload deliberately kept minimal:
 * id, role and the token version ("tv"). Never put the password hash or
 * other sensitive fields in here; the payload is base64-decodable by
 * anyone, it is NOT encrypted, only signed.
 *
 * "tv" is the user's tokenVersion. Changing the password or signing out of
 * all devices increments it in the database, and protect rejects any token
 * whose tv no longer matches, so every older session ends at once.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, tv: tokenVersionOf(user) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

// A token version as a whole number. Missing or invalid counts as 0, so
// tokens issued before versions existed (no tv) and accounts created before
// (no tokenVersion field) keep working until the first change.
function tokenVersionOf(source) {
  const value = source && (source.tv !== undefined ? source.tv : source.tokenVersion);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

module.exports = generateToken;
module.exports.tokenVersionOf = tokenVersionOf;
