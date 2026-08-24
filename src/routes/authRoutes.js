const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { toPublicUser, findById } = require('../models/userModel');
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
router.get('/me', protect, (req, res) => {
  const user = findById(req.user.id);
  res.status(200).json({
    success: true,
    data: { user: toPublicUser(user) },
  });
});

module.exports = router;
