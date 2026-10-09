/**
 * Removes the throwaway users created by Newman runs and manual testing
 * (test-...@example.com and role-...@example.com). Nothing else is touched.
 * Refuses to run when NODE_ENV is production.
 *
 * Usage (from api/): npm run clean:test
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const logger = require('../src/utils/logger');

const TEST_EMAIL_PATTERN = /^(test|role)-.*@example\.com$/;

async function cleanTestData() {
  if (process.env.NODE_ENV === 'production') {
    logger.error('clean:test refuses to run when NODE_ENV is production');
    return 1;
  }

  await connectDB();

  // Never delete an admin, even if the email happens to match.
  const { deletedCount } = await User.deleteMany({
    email: { $regex: TEST_EMAIL_PATTERN },
    role: { $ne: 'admin' },
  });

  logger.info(`Removed ${deletedCount} test user(s)`);
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
