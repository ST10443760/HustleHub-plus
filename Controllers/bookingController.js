const crypto = require("crypto");
const { load, save } = require("../utils/storage");

exports.bookGig = (req, res) => {
  const gigId = req.params.id;

  // Check if the gig exists
  const gig = load("gigs").find((g) => g.id === gigId);
  if (!gig) return res.status(404).json({ error: "Gig not found" });

   // Cannot book your own gig
  if (gig.freelancerId === req.user.id)
    return res.status(403).json({ error: "Cannot book your own gig" });

  // Ensure no duplicate bookings
  const bookings = load("bookings");
  const duplicate = bookings.find(
    (b) => b.gigId === gigId && b.clientId === req.user.id && b.status !== "cancelled"
  );
  if (duplicate)
    return res.status(409).json({ error: "You already booked this gig" });

  // Create a new booking and simulated payment transaction
  const now = new Date().toISOString();
  const booking = {
    id: crypto.randomUUID(),
    gigId,
    clientId: req.user.id,
    freelancerId: gig.freelancerId,
    status: "confirmed",
    createdAt: now,
  };
  const transaction = {
    id: crypto.randomUUID(),
    bookingId: booking.id,
    gigId,
    clientId: req.user.id,
    freelancerId: gig.freelancerId,
    amount: gig.price,
    status: "simulated",
    createdAt: now,
  };

  bookings.push(booking);
  const transactions = load("transactions");
  transactions.push(transaction);
  save("bookings", bookings);
  save("transactions", transactions);

  res.status(201).json({ message: "Simulated booking confirmed", booking, transaction });
};