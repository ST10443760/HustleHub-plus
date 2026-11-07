/**
 * Checks the settings the API can't run without, before anything starts.
 * Without this, a missing JWT_SECRET only showed up at the first login
 * (jwt.sign throws) or as every protected route answering 401.
 *
 * Returns a list of problems. The messages name the setting but never
 * include its value.
 */
const { resolveTrustProxy } = require('./proxy');

const MIN_PRODUCTION_SECRET_LENGTH = 32;

function validateEnv(env = process.env) {
  const problems = [];
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';

  if (!secret) {
    problems.push('JWT_SECRET is not set. Put a long random value in .env (see .env.example).');
  } else if (env.NODE_ENV === 'production' && secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    problems.push(`JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production.`);
  }

  if (!env.MONGO_URI || !env.MONGO_URI.trim()) {
    problems.push('MONGO_URI is not set. Point it at MongoDB (see .env.example).');
  }

  try {
    resolveTrustProxy(env);
  } catch (err) {
    problems.push(err.message);
  }

  return problems;
}

module.exports = { validateEnv, MIN_PRODUCTION_SECRET_LENGTH };
