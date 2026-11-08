const express = require('express');
const router = express.Router();

const { listUsers, listTransactions, deleteAnyGig, listAuditLogs } = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { paginationQueryRules, handleValidationErrors } = require('../middleware/validators');
const validateObjectId = require('../middleware/validateObjectId');
const { auditLogQueryRules } = require('../middleware/adminValidators');

// Every admin route needs a valid token AND the admin role.
router.use(protect, requireRole('admin'));

router.get('/users', listUsers);
router.get('/transactions', paginationQueryRules, handleValidationErrors, listTransactions);
router.delete('/gigs/:id', validateObjectId, deleteAnyGig);
// Read only: there is no route that changes or deletes audit entries.
router.get('/audit-logs', auditLogQueryRules, handleValidationErrors, listAuditLogs);

module.exports = router;
