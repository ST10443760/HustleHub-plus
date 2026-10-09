const bcryptjs = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;
const DUPLICATE_EMAIL_MESSAGE = 'An account with this email already exists';

async function register(req, res, next) {
  try {
    // Only pick the fields we expect - anything else in the body is ignored.
    // Role is limited to client/freelancer by the validator; admin never
    // gets through here.
    const { name, email, password, role = 'client' } = req.body;

    const existing = await User.exists({ email });
    if (existing) {
      // 409 Conflict - don't reveal *why* beyond "already registered",
      // and definitely don't confirm/deny in a way that helps enumerate users.
      logger.event('AUTH', 'Registration attempt with existing email', { email });
      throw new AppError(DUPLICATE_EMAIL_MESSAGE, 409);
    }

    const passwordHash = await bcryptjs.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role });

    logger.event('AUTH', 'User registered', { userId: user.id, role: user.role });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (err) {
    // Two requests racing with the same email both pass the exists() check,
    // so the unique index is the real guard - map it to the same 409.
    if (err.code === 11000) {
      return next(new AppError(DUPLICATE_EMAIL_MESSAGE, 409));
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // passwordHash is select: false on the model, so ask for it explicitly.
    const user = await User.findOne({ email }).select('+passwordHash');
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
        user: user.toJSON(), // toJSON strips passwordHash
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
