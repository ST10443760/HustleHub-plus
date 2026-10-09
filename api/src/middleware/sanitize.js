const mongoSanitize = require('express-mongo-sanitize');
const logger = require('../utils/logger');

/**
 * Global NoSQL-injection guard, applied to every request before the routes.
 *
 * Removes any key that starts with "$" or contains "." from req.body,
 * req.query and req.params, so operator objects like { "$gt": "" } can
 * never reach a Mongoose query. This sits on top of the per-route
 * validators (which already reject unknown fields and wrong types) as
 * defence in depth.
 *
 * Only the location and IP are logged - never the stripped value, which
 * could contain anything the attacker sent.
 */
const sanitize = mongoSanitize({
  onSanitize: ({ req, key }) => {
    logger.event('SANITIZE', 'Removed operator keys from request input', {
      location: key,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    });
  },
});

module.exports = sanitize;
