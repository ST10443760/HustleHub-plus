const jwt = require('jsonwebtoken');

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return process.env.JWT_SECRET;
}

function generateToken(user) {
  if (!user || user.id === undefined || !user.role) {
    throw new Error('User ID and role are required to generate a JWT');
  }

  return jwt.sign(
    {
      userId: user.id,
      role: user.role
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    }
  );
}

module.exports = {
  generateToken
};