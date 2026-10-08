const { load } = require("../src/utils/storage");

exports.getIncome = (req, res) => {
  // Get the ID of the currently logged-in user from the JWT
  const freelancerId = req.user.userId;

  // Only freelancers should access income tracking
  if (req.user.role !== "freelancer") {
    return res.status(403).json({
      success: false,
      message: "Only freelancers can access income tracking"
    });
  }

  // Load bookings and transactions
  const bookings = load("bookings");
  const transactions = load("transactions");

  // Only show bookings belonging to the logged-in freelancer
  const freelancerBookings = bookings.filter(
    (booking) => booking.freelancerId === freelancerId
  );

  // Only include transactions belonging to the logged-in freelancer
  const freelancerTransactions = transactions.filter(
    (transaction) => transaction.freelancerId === freelancerId
  );

  // Calculate the freelancer's total income
  const totalIncome = freelancerTransactions.reduce(
    (total, transaction) => total + Number(transaction.amount),
    0
  );

  res.status(200).json({
    success: true,
    freelancerId,
    totalIncome,
    bookings: freelancerBookings
  });
};