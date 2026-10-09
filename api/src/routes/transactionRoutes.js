const express = require('express');
const router = express.Router();

const { listMyTransactions } = require('../controllers/transactionController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Transactions are created automatically with each booking - there is no
// route to create or change one directly.
router.use(protect);

router.get('/mine', requireRole('client', 'freelancer'), listMyTransactions);

module.exports = router;
