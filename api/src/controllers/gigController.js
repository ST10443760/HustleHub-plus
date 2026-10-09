const Gig = require('../models/Gig');
const { AppError } = require('../middleware/errorHandler');
const escapeRegex = require('../utils/escapeRegex');
const { removeOrDeactivateGig } = require('../utils/gigRemoval');
const logger = require('../utils/logger');

// Fields a freelancer may set. The owner (freelancer) is never in these
// lists - it always comes from req.user.id.
const CREATE_FIELDS = ['title', 'description', 'price', 'category', 'deliveryDays'];
const UPDATE_FIELDS = [...CREATE_FIELDS, 'isActive'];

// Only the freelancer's name is shown on a gig - never their email.
const FREELANCER_PUBLIC_FIELDS = 'name';

const DEFAULT_PAGE_SIZE = 10;

function pick(source, fields) {
  const picked = {};
  for (const field of fields) {
    if (source[field] !== undefined) picked[field] = source[field];
  }
  return picked;
}

// GET /api/gigs - active gigs, newest first, with filters and pagination.
async function listGigs(req, res, next) {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || DEFAULT_PAGE_SIZE;
    const { category, q, minPrice, maxPrice } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }
    if (q) {
      // Escaped so the search is plain text, not a user-supplied pattern.
      const pattern = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: pattern }, { description: pattern }];
    }

    const [gigs, total] = await Promise.all([
      Gig.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('freelancer', FREELANCER_PUBLIC_FIELDS),
      Gig.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: { gigs: gigs.map((g) => g.toJSON()), page, limit, total },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/gigs/mine - the logged-in freelancer's gigs, including inactive ones.
async function listMyGigs(req, res, next) {
  try {
    const gigs = await Gig.find({ freelancer: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { gigs: gigs.map((g) => g.toJSON()) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/gigs/:id - one gig. Inactive gigs are only visible to their owner;
// everyone else gets the same 404 as a gig that doesn't exist.
async function getGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id).populate('freelancer', FREELANCER_PUBLIC_FIELDS);

    const isOwner = Boolean(gig && gig.freelancer && gig.freelancer.id === req.user.id);
    if (!gig || (!gig.isActive && !isOwner)) {
      throw new AppError('Gig not found', 404);
    }

    res.status(200).json({ success: true, data: { gig: gig.toJSON() } });
  } catch (err) {
    next(err);
  }
}

// POST /api/gigs - freelancer only. The owner is always the logged-in user.
async function createGig(req, res, next) {
  try {
    const gig = await Gig.create({
      ...pick(req.body, CREATE_FIELDS),
      freelancer: req.user.id,
    });

    logger.event('GIG', 'Gig created', { gigId: gig.id, freelancerId: req.user.id });

    res.status(201).json({ success: true, data: { gig: gig.toJSON() } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/gigs/:id - owner only. requireOwnership has already loaded the
// gig into req.resource and checked it belongs to req.user.
async function updateGig(req, res, next) {
  try {
    const gig = req.resource;
    const updates = pick(req.body, UPDATE_FIELDS);

    Object.assign(gig, updates);
    await gig.save();

    logger.event('GIG', 'Gig updated', {
      gigId: gig.id,
      freelancerId: req.user.id,
      fields: Object.keys(updates),
    });

    res.status(200).json({ success: true, data: { gig: gig.toJSON() } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/gigs/:id - owner only. A gig with bookings is deactivated
// instead of deleted, so bookings and transactions keep a valid reference.
async function deleteGig(req, res, next) {
  try {
    const result = await removeOrDeactivateGig(req.resource);

    logger.event('GIG', result.deleted ? 'Gig deleted' : 'Gig deactivated instead of deleted - it has bookings', {
      gigId: result.id,
      freelancerId: req.user.id,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { listGigs, listMyGigs, getGig, createGig, updateGig, deleteGig };
