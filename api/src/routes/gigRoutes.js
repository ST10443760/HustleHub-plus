const express = require('express');
const router = express.Router();

const {
  listGigs,
  listMyGigs,
  getGig,
  createGig,
  updateGig,
  deleteGig,
} = require('../controllers/gigController');
const Gig = require('../models/Gig');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { requireOwnership } = require('../middleware/ownership');
const validateObjectId = require('../middleware/validateObjectId');
const { handleValidationErrors } = require('../middleware/validators');
const { createGigRules, updateGigRules, listGigsQueryRules } = require('../middleware/gigValidators');

// Owner checks compare the gig's freelancer with req.user.id. Admins don't
// bypass this here - admin removal of gigs gets its own route later.
const requireGigOwner = requireOwnership(Gig, { ownerField: 'freelancer', resourceName: 'Gig' });

// Only logged-in users can browse or manage gigs.
router.use(protect);

router.get('/', listGigsQueryRules, handleValidationErrors, listGigs);

// Must stay above '/:id', otherwise "mine" would be treated as an id.
router.get('/mine', requireRole('freelancer'), listMyGigs);

router.get('/:id', validateObjectId, getGig);

router.post('/', requireRole('freelancer'), createGigRules, handleValidationErrors, createGig);

router.put(
  '/:id',
  requireRole('freelancer'),
  validateObjectId,
  requireGigOwner,
  updateGigRules,
  handleValidationErrors,
  updateGig
);

router.delete('/:id', requireRole('freelancer'), validateObjectId, requireGigOwner, deleteGig);

module.exports = router;
