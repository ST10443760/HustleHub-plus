const bcryptjs = require('bcryptjs');
const { findByEmail, createUser, toPublicUser } = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = findByEmail(email);
    if (existing) {
      // 409 Conflict - don't reveal *why* beyond "already registered",
      // and definitely don't confirm/deny in a way that helps enumerate users.
      logger.event('AUTH', 'Registration attempt with existing email', { email });
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await bcryptjs.hash(password, SALT_ROUNDS);
    const user = createUser({ name, email, passwordHash });

    logger.event('AUTH', 'User registered', { userId: user.id });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        user: toPublicUser(user),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = findByEmail(email);
    if (!user) {
      logger.event('AUTH', 'Failed login - unknown email', { email });
      // Same generic message as "wrong password" below - never confirm
      // whether the email exists, that's a user-enumeration leak.
      throw new AppError('Invalid email or password', 401);
    }

    const passwordMatches = await bcryptjs.compare(password, user.passwordHash);
    if (!passwordMatches) {
      logger.event('AUTH', 'Failed login - wrong password', { userId: user.id });
      throw new AppError('Invalid email or password', 401);
    }

    logger.event('AUTH', 'User logged in', { userId: user.id });

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      data: {
        user: toPublicUser(user),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
