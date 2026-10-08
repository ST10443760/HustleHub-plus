const express = require("express");
const gig = require("../Controllers/gigController");

const router = express.Router();

router.post("/gigs", gig.createGig);
router.get("/gigs", gig.listGigs);
router.get("/gigs/:id", gig.getGig);
router.put("/gigs/:id", gig.updateGig);
router.delete("/gigs/:id", gig.deleteGig);

module.exports = router;