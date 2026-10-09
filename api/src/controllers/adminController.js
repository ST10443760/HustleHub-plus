const User = require('../models/User');
const logger = require('../utils/logger');

// GET /api/admin/users - every user, newest first. passwordHash is
// select: false on the model and stripped again by toJSON.
async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    logger.event('ADMIN', 'Listed all users', { adminId: req.user.id, count: users.length });

    res.status(200).json({
      success: true,
      data: { users: users.map((u) => u.toJSON()) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers };
