const express = require("express");
const gig = require("../Controllers/gigController");
const {bookGig} = require("../Controllers/bookingController");

const router = express.Router();

router.post("/gigs", gig.createGig);
router.get("/gigs", gig.listGigs);
router.get("/gigs/:id", gig.getGig);
router.put("/gigs/:id", gig.updateGig);
router.delete("/gigs/:id", gig.deleteGig);
router.post("/gigs/:id/book", bookGig);

module.exports = router;