const express = require('express');
const router = express.Router();

const { register, login, changePassword, logoutAll } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter, passwordChangeLimiter } = require('../middleware/rateLimiters');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const {
  registerValidationRules,
  loginValidationRules,
  changePasswordRules,
  emptyBodyRules,
  handleValidationErrors,
} = require('../middleware/validators');

// Limiters run first, so even requests that fail validation are counted.
router.post('/register', registerLimiter, registerValidationRules, handleValidationErrors, register);
router.post('/login', loginLimiter, loginValidationRules, handleValidationErrors, login);

// Any logged-in user. The password change limiter is per user, so it comes
// after protect.
router.post('/change-password', protect, passwordChangeLimiter, changePasswordRules, handleValidationErrors, changePassword);
router.post('/logout-all', protect, emptyBodyRules, handleValidationErrors, logoutAll);

/**
 * "Who am I": returns the logged-in user. The React client calls it on
 * start-up to check a stored token. Requires: Authorization: Bearer <token>
 */
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError('Not authenticated - user no longer exists', 401);
    }
    res.status(200).json({
      success: true,
      data: { user: user.toJSON() },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
