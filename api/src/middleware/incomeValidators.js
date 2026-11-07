const { query, checkExact } = require('express-validator');
const { SUPPORTED_TAX_YEARS } = require('../config/tax');

/**
 * ?taxYear for GET /api/income/tax-estimate: the calendar year the tax
 * year starts in (2026 = 1 March 2026 to 28 February 2027). Optional;
 * only years with a configured SARS table are accepted. Any other query
 * parameter is rejected (checkExact).
 */
const taxEstimateQueryRules = [
  checkExact(
    [
      query('taxYear')
        .optional()
        // ?taxYear=2026&taxYear=2025 arrives as an array
        .custom((value) => typeof value === 'string').withMessage('taxYear must be a single value').bail()
        .matches(/^\d{4}$/).withMessage('taxYear must be a 4-digit year, for example 2026').bail()
        .custom((value) => SUPPORTED_TAX_YEARS.includes(Number(value)))
        .withMessage(`taxYear must be one of: ${SUPPORTED_TAX_YEARS.join(', ')}`).bail()
        .toInt(),
    ],
    { locations: ['query'], message: 'Request contains query parameters that are not allowed' }
  ),
];

module.exports = { taxEstimateQueryRules };
