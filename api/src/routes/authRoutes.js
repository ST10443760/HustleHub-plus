const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const {
  registerValidationRules,
  loginValidationRules,
  handleValidationErrors,
} = require('../middleware/validators');

// Limiters run first, so even requests that fail validation are counted.
router.post('/register', registerLimiter, registerValidationRules, handleValidationErrors, register);
router.post('/login', loginLimiter, loginValidationRules, handleValidationErrors, login);

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
