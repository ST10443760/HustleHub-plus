const { body, query, checkExact, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Validation rule sets for auth routes. Kept separate from the controller
 * so the "what's allowed in" rules are easy to find and audit in one place.
 */
const registerValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),
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
    .notEmpty().withMessage('Password is required'),
];

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
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return next(new AppError(messages.join('; '), 400));
  }
  next();
}

module.exports = {
  registerValidationRules,
  loginValidationRules,
  paginationQueryRules,
  handleValidationErrors,
};
