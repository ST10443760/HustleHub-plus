const crypto = require("crypto");
const { load, save } = require("../utils/storage");
const {parseGigInput} = require("../utils/sanitise");

exports.createGig = (req, res) => {
  const { out, errors } = parseGigInput(req.body);
  if (errors.length) return res.status(400).json({errors}); 

  const gigs = load("gigs");
  const gig = {
    id: crypto.randomUUID(),
    ...out,
    freelancerId: req.user.id,
    createdAt: new Date().toISOString(),
  };
  gigs.push(gig);
    save("gigs", gigs);
    res.status(201).json(gig);
};

exports.listGigs = (req, res) => { res.json(load("gigs")); };

exports.getGig = (req, res) => {
    const gig = load("gigs").find((g) => g.id === req.params.id);
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    res.json(gig);
};

exports.updateGig = (req, res) => {
    const gigs = load("gigs");
    const gig = gigs.find((g) => g.id === req.params.id);
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.freelancerId !== req.user.id) 
        return res.status(403).json({ error: "You can only edit your own gigs"});

    const { out, errors } = parseGigInput(req.body, true);
    if (errors.length) return res.status(400).json({ errors });

    Object.assign(gig, out, { updatedAt: new Date().toISOString() });
    save("gigs", gigs);
    res.json(gig);
};

exports.deleteGig = (req, res) => {
    const gigs = load("gigs");
    const gig = gigs.find((g) => g.id === req.params.id);
    if (!gig) return res.status(404).json({ error: "Gig not found" });
    if (gig.freelancerId !== req.user.id)
        return res.status(403).json({ error: "You can only delete your own gigs" });

    save("gigs", gigs.filter((g) => g.id !== req.params.id));
    res.status(204).end();
}

