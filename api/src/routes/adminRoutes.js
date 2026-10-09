const express = require('express');
const router = express.Router();

const { listUsers } = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Every admin route needs a valid token AND the admin role.
router.use(protect, requireRole('admin'));

router.get('/users', listUsers);

module.exports = router;
