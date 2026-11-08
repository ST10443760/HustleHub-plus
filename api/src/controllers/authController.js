const User = require('../models/User');
const { hashPassword } = require('../utils/password');
const { verifyPassword, burnPasswordCheck } = require('../utils/accountLockout');
const { recordAudit } = require('../utils/audit');
const generateToken = require('../utils/generateToken');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const DUPLICATE_EMAIL_MESSAGE = 'An account with this email already exists';
const INVALID_LOGIN_MESSAGE = 'Invalid email or password';
// One message for a wrong current password and a locked account. 400, not
// 401: the session itself is fine, and a 401 would log the user out.
const CURRENT_PASSWORD_MESSAGE =
  'Current password is incorrect, or there have been too many attempts. Try again later.';

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
      logger.event('AUTH', 'Registration attempt with existing email', {
        email: logger.maskEmail(email),
        ip: req.ip,
      });
      throw new AppError(DUPLICATE_EMAIL_MESSAGE, 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash, role });

    logger.event('AUTH', 'User registered', { userId: user.id, role: user.role, ip: req.ip });

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

    // passwordHash and tokenVersion are select: false on the model, so ask
    // for them explicitly. Without tokenVersion the new token would carry
    // the wrong version and be rejected straight away.
    const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');

    // Unknown email: bcrypt still runs, against a dummy hash. Known email:
    // the lockout is applied (a locked account never has its real password
    // checked, a dummy compare runs instead). Either way every failure
    // takes about the same time.
    const passwordMatches = user ? await verifyPassword(req, user, password) : (await burnPasswordCheck(password), false);

    if (!passwordMatches) {
      // ONE message, status and shape for an unknown email, a wrong password
      // and a locked account, so none of them can be told apart. The log
      // doesn't say which either. Never the password.
      logger.event('AUTH', 'Failed login', { email: logger.maskEmail(email), ip: req.ip });
      throw new AppError(INVALID_LOGIN_MESSAGE, 401);
    }

    logger.event('AUTH', 'User logged in', { userId: user.id, ip: req.ip });

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

// POST /api/auth/change-password - any logged-in user. Checks the current
// password (with the lockout), saves the new hash and bumps tokenVersion,
// which ends every other session. The response carries a fresh token so
// this session continues.
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      throw new AppError('Not authenticated - user no longer exists', 401);
    }

    if (!(await verifyPassword(req, user, currentPassword))) {
      logger.event('AUTH', 'Password change refused - current password wrong or account locked', {
        userId: user.id,
        ip: req.ip,
      });
      throw new AppError(CURRENT_PASSWORD_MESSAGE, 400);
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: { passwordHash }, $inc: { tokenVersion: 1 } },
      { returnDocument: 'after' }
    ).select('+tokenVersion');

    logger.event('AUTH', 'Password changed - every other session signed out', { userId: updated.id, ip: req.ip });
    await recordAudit(req, { action: 'password_changed', targetType: 'user', targetId: updated._id });

    res.status(200).json({
      success: true,
      data: {
        user: updated.toJSON(),
        token: generateToken(updated),
        message: 'Password changed. You have been signed out everywhere else.',
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout-all - any logged-in user. Bumps tokenVersion, so
// every token issued so far, including the one used for this request,
// stops working.
async function logoutAll(req, res, next) {
  try {
    const updated = await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } }, { returnDocument: 'after' });
    if (!updated) {
      throw new AppError('Not authenticated - user no longer exists', 401);
    }

    logger.event('AUTH', 'Signed out of all devices', { userId: updated.id, ip: req.ip });
    await recordAudit(req, { action: 'logout_all', targetType: 'user', targetId: updated._id });

    res.status(200).json({ success: true, data: { message: 'You have been signed out of all devices.' } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, changePassword, logoutAll };
