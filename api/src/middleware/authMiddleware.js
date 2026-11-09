const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { AppError } = require('./errorHandler');
const User = require('../models/User');
const logger = require('../utils/logger');
const { tokenVersionOf } = require('../utils/generateToken');
const { setContextUser, routeOf } = require('../utils/requestContext');

const INVALID_TOKEN_MESSAGE = 'Not authenticated - invalid or expired token';

// Logs the refusal (ACCESS_DENIED, with the internal reason and the route)
// and returns the error for next(). The response message stays generic.
function denied(req, reason, message, status) {
  logger.event('ACCESS_DENIED', 'Access denied', { reason, status, route: routeOf(req) });
  return new AppError(message, status);
}

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
    return next(denied(req, 'no_token', 'Not authenticated - no token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // Covers both expired and tampered/invalid tokens - same generic
    // message either way, no need to tell an attacker which case it was.
    // The log keeps the difference.
    return next(denied(req, err.name === 'TokenExpiredError' ? 'expired_token' : 'invalid_token', INVALID_TOKEN_MESSAGE, 401));
  }

  if (!mongoose.isValidObjectId(decoded.id)) {
    return next(denied(req, 'invalid_token', INVALID_TOKEN_MESSAGE, 401));
  }

  try {
    // Role comes from the database, not the token, so a role change takes
    // effect straight away.
    const user = await User.findById(decoded.id).select('role +tokenVersion');

    if (!user) {
      return next(denied(req, 'user_not_found', 'Not authenticated - user no longer exists', 401));
    }

    // A password change or "sign out of all devices" bumps tokenVersion,
    // which ends every token issued before it.
    if (tokenVersionOf(decoded) !== tokenVersionOf(user)) {
      return next(denied(req, 'revoked_token', INVALID_TOKEN_MESSAGE, 401));
    }

    req.user = { id: user.id, role: user.role };
    setContextUser(req.user); // every later log line in this request carries the user
    next();
  } catch (err) {
    // A database failure is a server error, not an auth failure.
    next(err);
  }
}

/**
 * Role-based access control - use after `protect`.
 * Usage: router.delete('/gigs/:id', protect, requireRole('freelancer'), ...)
 *
 * The response stays generic - it never says which roles would have been
 * allowed, so it can't be used to map out the permission model.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(denied(req, 'wrong_role', 'You do not have permission to perform this action', 403));
    }
    next();
  };
}

module.exports = { protect, requireRole };
