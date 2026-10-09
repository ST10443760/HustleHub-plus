/**
 * Removes the throwaway users created by Newman runs and manual testing
 * (test-...@example.com and role-...@example.com), along with their gigs,
 * bookings and transactions. Nothing else is touched.
 * Refuses to run when NODE_ENV is production.
 *
 * Usage (from api/): npm run clean:test
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Gig = require('../src/models/Gig');
const Booking = require('../src/models/Booking');
const Transaction = require('../src/models/Transaction');
const logger = require('../src/utils/logger');

const TEST_EMAIL_PATTERN = /^(test|role)-.*@example\.com$/;

async function cleanTestData() {
  if (process.env.NODE_ENV === 'production') {
    logger.error('clean:test refuses to run when NODE_ENV is production');
    return 1;
  }

  await connectDB();

  // Never delete an admin, even if the email happens to match.
  const testUsers = await User.find({
    email: { $regex: TEST_EMAIL_PATTERN },
    role: { $ne: 'admin' },
  }).select('_id');
  const ids = testUsers.map((u) => u._id);

  // Remove everything those users own or took part in, then the users.
  const ownedBy = { $or: [{ client: { $in: ids } }, { freelancer: { $in: ids } }] };
  const transactions = await Transaction.deleteMany(ownedBy);
  const bookings = await Booking.deleteMany(ownedBy);
  const gigs = await Gig.deleteMany({ freelancer: { $in: ids } });
  const users = await User.deleteMany({ _id: { $in: ids } });

  logger.info(
    `Removed ${users.deletedCount} test user(s), ${gigs.deletedCount} gig(s), ` +
      `${bookings.deletedCount} booking(s) and ${transactions.deletedCount} transaction(s)`
  );
  return 0;
}

cleanTestData()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    logger.error('Test data cleanup failed', { errorName: err.name });
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
