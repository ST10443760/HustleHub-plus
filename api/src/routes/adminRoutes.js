const express = require('express');
const router = express.Router();

const { listUsers, listTransactions, deleteAnyGig } = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { paginationQueryRules, handleValidationErrors } = require('../middleware/validators');
const validateObjectId = require('../middleware/validateObjectId');

// Every admin route needs a valid token AND the admin role.
router.use(protect, requireRole('admin'));

router.get('/users', listUsers);
router.get('/transactions', paginationQueryRules, handleValidationErrors, listTransactions);
router.delete('/gigs/:id', validateObjectId, deleteAnyGig);

module.exports = router;
