const crypto = require('crypto');
const bcryptjs = require('bcryptjs');

// One place for the cost factor so register and the admin seed script
// always hash the same way.
const SALT_ROUNDS = 10;

// A real bcrypt hash of a random throwaway value. Login compares against
// this when the email doesn't exist, so an unknown email takes as long as
// a wrong password - response time can't be used to find valid accounts.
const DUMMY_HASH = bcryptjs.hashSync(crypto.randomBytes(16).toString('hex'), SALT_ROUNDS);

function hashPassword(password) {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

function comparePassword(password, hash) {
  return bcryptjs.compare(password, hash);
}

module.exports = { SALT_ROUNDS, DUMMY_HASH, hashPassword, comparePassword };
