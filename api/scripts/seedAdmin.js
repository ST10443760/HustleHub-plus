/**
 * Creates the admin account. Admins can't sign up through the public
 * register endpoint, so this is the only way one gets created.
 *
 * Reads ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_NAME from api/.env.
 * Safe to run more than once: if the email already exists it stops
 * without changing anything. Never logs the password or the database URI.
 *
 * Usage (from api/): npm run seed:admin
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { hashPassword } = require('../src/utils/password');
const logger = require('../src/utils/logger');

const MIN_PASSWORD_LENGTH = 12;

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Administrator').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    logger.error('ADMIN_EMAIL is missing or not a valid email - nothing seeded');
    return 1;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    logger.error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters - nothing seeded`);
    return 1;
  }

  await connectDB();

  const existing = await User.findOne({ email }).select('role');
  if (existing) {
    logger.info('Admin seed skipped - an account with this email already exists', {
      email,
      role: existing.role,
    });
    return 0;
  }

  const passwordHash = await hashPassword(password);
  const admin = await User.create({ name, email, passwordHash, role: 'admin' });

  logger.event('ADMIN', 'Admin account seeded', { userId: admin.id, email });
  return 0;
}

seedAdmin()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    // connectDB already logged a safe message for connection failures.
    logger.error('Admin seed failed', { errorName: err.name });
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
