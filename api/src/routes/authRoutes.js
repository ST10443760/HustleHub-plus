const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const {
  registerValidationRules,
  loginValidationRules,
  handleValidationErrors,
} = require('../middleware/validators');

router.post('/register', registerValidationRules, handleValidationErrors, register);
router.post('/login', loginValidationRules, handleValidationErrors, login);

/**
 * Protected test route - proves the JWT middleware actually works.
 * Requires: Authorization: Bearer <token>
 * This is also just a genuinely useful "who am I" endpoint the frontend
 * will want in Part 2.
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
