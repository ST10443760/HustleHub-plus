const { body, validationResult } = require('express-validator');
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
  handleValidationErrors,
};
