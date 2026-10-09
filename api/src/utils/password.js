const bcryptjs = require('bcryptjs');

// One place for the cost factor so register and the admin seed script
// always hash the same way.
const SALT_ROUNDS = 10;

function hashPassword(password) {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

function comparePassword(password, hash) {
  return bcryptjs.compare(password, hash);
}

module.exports = { SALT_ROUNDS, hashPassword, comparePassword };
