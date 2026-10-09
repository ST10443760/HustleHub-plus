const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { AppError } = require('./errorHandler');
const User = require('../models/User');

/**
 * Protects a route - requires a valid JWT in the Authorization header
 * as: "Authorization: Bearer <token>"
 *
 * On success, attaches the authenticated user to req.user so downstream
 * controllers can use it (e.g. req.user.id, req.user.role).
 */
async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Not authenticated - no token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // Covers both expired and tampered/invalid tokens - same generic
    // message either way, no need to tell an attacker which case it was.
    return next(new AppError('Not authenticated - invalid or expired token', 401));
  }

  if (!mongoose.isValidObjectId(decoded.id)) {
    return next(new AppError('Not authenticated - invalid or expired token', 401));
  }

  try {
    // Role comes from the database, not the token, so a role change takes
    // effect straight away.
    const user = await User.findById(decoded.id).select('role');

    if (!user) {
      return next(new AppError('Not authenticated - user no longer exists', 401));
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    // A database failure is a server error, not an auth failure.
    next(err);
  }
}

/**
 * Role-based access control - use after `protect`.
 * Usage: router.delete('/gigs/:id', protect, requireRole('freelancer'), ...)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
}

module.exports = { protect, requireRole };
