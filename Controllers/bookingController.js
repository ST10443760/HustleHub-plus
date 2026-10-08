const crypto = require("crypto");
const { load, save } = require("../utils/storage");

exports.bookGig = (req, res) => {
    const gigId = req.params.id;
  
  // Check if the gig exists
  const gig = load("gigs").find((g) => g.id === gigId);
    if (!gig) return res.status(404).json({ error: "Gig not found" });
}

   // Cannot book your own gig
    if (gig.freelancerId === req.user.id) {
        return res.status(403).json({ error: "Cannot book your own gig" });
    }

