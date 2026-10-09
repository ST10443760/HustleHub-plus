const express = require('express');
const router = express.Router();

const { listUsers, listTransactions } = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { paginationQueryRules, handleValidationErrors } = require('../middleware/validators');

// Every admin route needs a valid token AND the admin role.
router.use(protect, requireRole('admin'));

router.get('/users', listUsers);
router.get('/transactions', paginationQueryRules, handleValidationErrors, listTransactions);

module.exports = router;
