const express = require('express');
const router = express.Router();

const { getIncome } = require('../controllers/incomeController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.get('/', protect, requireRole('freelancer'), getIncome);

module.exports = router;
