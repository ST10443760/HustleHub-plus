const jwt = require('jsonwebtoken');

/**
 * Issues a JWT for a given user. Payload deliberately kept minimal -
 * id and role only. Never put the password hash or other sensitive
 * fields in here; the payload is base64-decodable by anyone, it is
 * NOT encrypted, only signed.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

module.exports = generateToken;
