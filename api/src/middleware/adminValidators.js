const { query, checkExact } = require('express-validator');
const { AUDIT_ACTIONS } = require('../models/AuditLog');

/**
 * GET /api/admin/audit-logs: ?page, ?limit (like the transactions list) and
 * an optional ?action that must be one of the audit actions. Anything else
 * in the query string is rejected. typeof checks catch ?page=1&page=2,
 * which arrives as an array.
 */
const singleValue = (name) =>
  query(name)
    .optional()
    .custom((value) => typeof value === 'string').withMessage(`${name} must be a single value`).bail();

const auditLogQueryRules = [
  checkExact(
    [
      singleValue('page').isInt({ min: 1, max: 1000 }).withMessage('page must be a whole number from 1 to 1000').toInt(),
      singleValue('limit').isInt({ min: 1, max: 50 }).withMessage('limit must be a whole number from 1 to 50').toInt(),
      singleValue('action').isIn(AUDIT_ACTIONS).withMessage(`action must be one of: ${AUDIT_ACTIONS.join(', ')}`),
    ],
    { locations: ['query'], message: 'Request contains query parameters that are not allowed' }
  ),
];

module.exports = { auditLogQueryRules };
