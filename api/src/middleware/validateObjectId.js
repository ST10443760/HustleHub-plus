const { AppError } = require('./errorHandler');

// Exactly 24 hex characters. mongoose.isValidObjectId() is looser - it
// also accepts any 12-character string - so it isn't used here.
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

/**
 * Rejects a malformed :id before it reaches Mongoose, so a bad id is a
 * clean 400 rather than a CastError bubbling up from a query.
 * Usage: router.get('/:id', validateObjectId, ...)
 */
function validateObjectId(req, res, next) {
  if (typeof req.params.id !== 'string' || !OBJECT_ID_PATTERN.test(req.params.id)) {
    return next(new AppError('Invalid id', 400));
  }
  next();
}

module.exports = validateObjectId;
