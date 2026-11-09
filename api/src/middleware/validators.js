const { body, query, checkExact, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Validation rule sets for auth routes. Kept separate from the controller
 * so the "what's allowed in" rules are easy to find and audit in one place.
 */

// bcrypt only uses the first 72 bytes of a password and silently ignores the
// rest, so a longer password would be weaker than it looks. Measured in
// bytes, not characters: an emoji is 4 bytes.
const MAX_PASSWORD_BYTES = 72;
const isText = (value) => typeof value === 'string';

/**
 * The one set of password strength rules, used by registration and by
 * change-password so the two can't drift apart. `label` starts each message.
 */
function strongPassword(field, label) {
  return body(field)
    .exists().withMessage(`${label} is required`).bail()
    // typeof, not isString(): isString() would pass an array of strings.
    .custom(isText).withMessage(`${label} must be text`).bail()
    .notEmpty().withMessage(`${label} is required`).bail()
    .isLength({ min: 8 }).withMessage(`${label} must be at least 8 characters`)
    .matches(/\d/).withMessage(`${label} must contain at least one number`)
    .custom((value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES)
    .withMessage(`${label} must be at most ${MAX_PASSWORD_BYTES} bytes (about ${MAX_PASSWORD_BYTES} plain characters)`);
}

const registerValidationRules = [
  body('name')
    .exists().withMessage('Name is required').bail()
    // typeof, not isString(): isString() would pass an array of strings.
    .custom((value) => typeof value === 'string').withMessage('Name must be text').bail()
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters')
    .escape(), // names are shown to other users, so store them HTML-escaped
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  strongPassword('password', 'Password'),
  // Optional - defaults to client. Admin is never allowed through public
  // registration; admin accounts are seeded separately.
  body('role')
    .optional()
    .isIn(['client', 'freelancer']).withMessage('Role must be either client or freelancer'),
];

const loginValidationRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required').bail()
    // An array or object would otherwise reach bcrypt and fail with a 500.
    .custom(isText).withMessage('Password must be text'),
];

/**
 * POST /api/auth/change-password: { currentPassword, newPassword } and
 * nothing else. The new password follows the registration rules and must
 * differ from the current one. The current password is only checked for
 * being text of a sane length; whether it is RIGHT is the controller's job.
 */
const changePasswordRules = [
  checkExact(
    [
      body('currentPassword')
        .exists().withMessage('Current password is required').bail()
        .custom(isText).withMessage('Current password must be text').bail()
        .notEmpty().withMessage('Current password is required').bail()
        .isLength({ max: 1024 }).withMessage('Current password is too long'),
      strongPassword('newPassword', 'New password')
        .bail()
        .custom((value, { req }) => value !== req.body.currentPassword)
        .withMessage('New password must be different from the current password'),
    ],
    { locations: ['body'], message: 'Request contains fields that are not allowed' }
  ),
];

// POST /api/auth/logout-all takes no body fields at all.
const emptyBodyRules = [checkExact([], { locations: ['body'], message: 'Request contains fields that are not allowed' })];

/**
 * ?page and ?limit for paginated lists. Anything else in the query string is
 * rejected. typeof checks catch ?page=1&page=2, which arrives as an array.
 */
const paginationQueryRules = [
  checkExact(
    ['page', 'limit'].map((name) =>
      query(name)
        .optional()
        .custom((value) => typeof value === 'string').withMessage(`${name} must be a single value`).bail()
        .isInt({ min: 1, max: name === 'limit' ? 50 : 1000 })
        .withMessage(name === 'limit' ? 'limit must be a whole number from 1 to 50' : 'page must be a whole number from 1 to 1000')
        .toInt()
    ),
    { locations: ['query'], message: 'Request contains query parameters that are not allowed' }
  ),
];

/**
 * Runs after the rule set above. Collects any validation errors and turns
 * them into a single clean 400 response via the centralised error handler -
 * never lets a raw validation error object reach the client.
 */
// The names of the fields that failed (including unknown fields that
// checkExact rejected). Never their values.
function failedFields(errors) {
  const names = errors.flatMap((e) => (e.type === 'unknown_fields' ? (e.fields || []).map((f) => f.path) : [e.path]));
  return [...new Set(names.filter((name) => typeof name === 'string' && name))].slice(0, 20);
}

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array();
    logger.event('VALIDATION_FAILED', 'Request failed validation', {
      source: 'validator',
      fields: failedFields(list),
      unknownFields: list.some((e) => e.type === 'unknown_fields') || undefined,
    });
    const messages = list.map((e) => e.msg);
    return next(new AppError(messages.join('; '), 400));
  }
  next();
}

module.exports = {
  MAX_PASSWORD_BYTES,
  registerValidationRules,
  loginValidationRules,
  changePasswordRules,
  emptyBodyRules,
  paginationQueryRules,
  handleValidationErrors,
};
