const { body, checkExact } = require('express-validator');
const { OBJECT_ID_PATTERN } = require('./validateObjectId');

/**
 * A booking request carries ONLY the gig id. Price, freelancer, client and
 * status all come from the database and the verified token, so any other
 * field in the body is rejected rather than ignored.
 */
const createBookingRules = [
  checkExact(
    [
      body('gigId')
        .exists().withMessage('gigId is required').bail()
        // typeof, not isString(): isString() would pass an array of strings.
        .custom((value) => typeof value === 'string').withMessage('gigId must be a string').bail()
        .custom((value) => OBJECT_ID_PATTERN.test(value)).withMessage('Invalid gigId'),
    ],
    { locations: ['body'], message: 'Request contains fields that are not allowed' }
  ),
];

module.exports = { createBookingRules };
