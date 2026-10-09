const express = require('express');
const router = express.Router();

const { createBooking, listMyBookings, getBooking } = require('../controllers/bookingController');
const Booking = require('../models/Booking');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { requireOwnership } = require('../middleware/ownership');
const validateObjectId = require('../middleware/validateObjectId');
const { handleValidationErrors } = require('../middleware/validators');
const { createBookingRules } = require('../middleware/bookingValidators');
const { bookingLimiter } = require('../middleware/rateLimiters');

// A booking belongs to both sides: its client and the gig's freelancer.
// Admins use the admin routes instead, so they don't bypass this.
const requireBookingParty = requireOwnership(Booking, {
  ownerField: ['client', 'freelancer'],
  resourceName: 'Booking',
});

router.use(protect);

// bookingLimiter counts per user, so it has to come after protect (router.use above).
router.post('/', requireRole('client'), bookingLimiter, createBookingRules, handleValidationErrors, createBooking);

// Must stay above '/:id', otherwise "mine" would be treated as an id.
router.get('/mine', requireRole('client', 'freelancer'), listMyBookings);

router.get('/:id', validateObjectId, requireBookingParty, getBooking);

module.exports = router;
