const crypto = require("crypto");
const { load, save } = require("../utils/storage");
const {parseGigInput} = require("../utils/sanitise");

exports.createGig = (req, res) => {
  const { out, errors } = parseGigInput(req.body);
  if (errors.length) return res.status(400).json({errors}); 
}