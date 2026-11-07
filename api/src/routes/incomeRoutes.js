const express = require('express');
const router = express.Router();

const { getIncome, getTaxEstimate } = require('../controllers/incomeController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validators');
const { taxEstimateQueryRules } = require('../middleware/incomeValidators');

// Freelancers only. The general rate limiter already covers all of /api.
router.get('/', protect, requireRole('freelancer'), getIncome);

router.get(
  '/tax-estimate',
  protect,
  requireRole('freelancer'),
  taxEstimateQueryRules,
  handleValidationErrors,
  getTaxEstimate
);

module.exports = router;
