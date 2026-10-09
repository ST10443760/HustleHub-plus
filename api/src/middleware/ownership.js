const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Loads the document for req.params.id and checks the logged-in user owns it.
 * Use after `protect` and `validateObjectId`.
 *
 * Usage:
 *   router.put('/:id', protect, validateObjectId,
 *     requireOwnership(Gig, { ownerField: 'freelancer', resourceName: 'Gig' }),
 *     updateGig);
 *
 * Options:
 *   ownerField   - field on the document holding the owner's user id, or an
 *                  array of fields when a record has more than one owner
 *                  (a booking belongs to both its client and its freelancer)
 *   resourceName - used in the 404 message ("Gig not found")
 *   allowAdmin   - when true, admins skip the owner check
 *
 * The owner is always compared against req.user.id, which comes from the
 * verified token plus a database lookup in `protect` - never from the body
 * or query string. On success the document is attached to req.resource so
 * the controller doesn't have to query it again.
 */
function requireOwnership(Model, { ownerField, resourceName = 'Resource', allowAdmin = false }) {
  const ownerFields = [].concat(ownerField || []);
  if (ownerFields.length === 0) {
    throw new Error('requireOwnership needs an ownerField');
  }

  return async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id);

      if (!doc) {
        throw new AppError(`${resourceName} not found`, 404);
      }

      const isAdminBypass = allowAdmin && req.user.role === 'admin';
      const isOwner = ownerFields.some(
        (field) => doc[field] && doc[field].toString() === String(req.user.id)
      );

      if (!isAdminBypass && !isOwner) {
        logger.event('RBAC', 'Access denied - not the owner', {
          userId: req.user.id,
          role: req.user.role,
          resource: resourceName,
          resourceId: req.params.id,
          method: req.method,
          path: req.originalUrl,
        });
        throw new AppError('You do not have permission to perform this action', 403);
      }

      req.resource = doc;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireOwnership };
