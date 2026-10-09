const { body, query, checkExact } = require('express-validator');
const { GIG_CATEGORIES } = require('../models/Gig');

/**
 * Validation for the gig routes. Text fields are trimmed, length-checked
 * and then HTML-escaped, so markup typed into a gig can't run in anyone's
 * browser later.
 *
 * Type checks use typeof on purpose: express-validator's built-in
 * validators check each item of an array separately, so isString() alone
 * would let ["a", "b"] through.
 *
 * Unknown fields are rejected outright (checkExact), so fields like
 * "freelancer" or "isActive" can't be slipped into a create request.
 */

const MAX_PRICE = 100000;
const UNKNOWN_FIELDS_MESSAGE = 'Request contains fields that are not allowed';

const isText = (value) => typeof value === 'string';
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const hasAtMostTwoDecimals = (value) => /^\d+(\.\d{1,2})?$/.test(String(value));

// Builds the field rules shared by create (all required) and update (all optional).
function gigFieldRules({ optional }) {
  const field = (name, label) => {
    const chain = body(name);
    return optional ? chain.optional() : chain.exists().withMessage(`${label} is required`).bail();
  };

  return [
    field('title', 'Title')
      .custom(isText).withMessage('Title must be text').bail()
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters')
      .escape(),
    field('description', 'Description')
      .custom(isText).withMessage('Description must be text').bail()
      .trim()
      .isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters')
      .escape(),
    field('price', 'Price')
      .custom(isNumber).withMessage('Price must be a number').bail()
      .custom((value) => value >= 1 && value <= MAX_PRICE)
      .withMessage(`Price must be between 1 and ${MAX_PRICE}`).bail()
      .custom(hasAtMostTwoDecimals).withMessage('Price can have at most 2 decimal places'),
    field('category', 'Category')
      .custom(isText).withMessage('Category must be text').bail()
      .trim()
      .isIn(GIG_CATEGORIES).withMessage(`Category must be one of: ${GIG_CATEGORIES.join(', ')}`)
      .escape(),
    field('deliveryDays', 'Delivery days')
      .custom((value) => Number.isInteger(value) && value >= 1 && value <= 90)
      .withMessage('Delivery days must be a whole number from 1 to 90'),
  ];
}

const createGigRules = [
  checkExact(gigFieldRules({ optional: false }), {
    locations: ['body'],
    message: UNKNOWN_FIELDS_MESSAGE,
  }),
];

const updateGigRules = [
  checkExact(
    [
      ...gigFieldRules({ optional: true }),
      body('isActive')
        .optional()
        .custom((value) => typeof value === 'boolean').withMessage('isActive must be true or false'),
    ],
    { locations: ['body'], message: UNKNOWN_FIELDS_MESSAGE }
  ),
  // Kept outside checkExact: a whole-body rule there would count every
  // field as "known" and switch the unknown-field check off.
  body()
    .custom((value) => value && typeof value === 'object' && Object.keys(value).length > 0)
    .withMessage('Provide at least one field to update'),
];

// Query strings arrive as strings - but ?q=a&q=b arrives as an array, so
// every param is checked for a single value first.
const singleQuery = (name) =>
  query(name)
    .optional()
    .custom(isText).withMessage(`${name} must be a single value`).bail();

const listGigsQueryRules = [
  checkExact(
    [
      singleQuery('page').isInt({ min: 1, max: 1000 }).withMessage('page must be a whole number from 1 to 1000').toInt(),
      singleQuery('limit').isInt({ min: 1, max: 50 }).withMessage('limit must be a whole number from 1 to 50').toInt(),
      singleQuery('category').isIn(GIG_CATEGORIES).withMessage(`category must be one of: ${GIG_CATEGORIES.join(', ')}`),
      // Escaped like the stored text, so a search for "Tom & Jerry" matches
      // what's actually saved ("Tom &amp; Jerry").
      singleQuery('q').trim().isLength({ max: 50 }).withMessage('q can be at most 50 characters').escape(),
      singleQuery('minPrice').isFloat({ min: 0, max: MAX_PRICE }).withMessage('minPrice must be a number from 0 to 100000').toFloat(),
      singleQuery('maxPrice').isFloat({ min: 0, max: MAX_PRICE }).withMessage('maxPrice must be a number from 0 to 100000').toFloat(),
      query('maxPrice')
        .optional()
        .custom((max, { req }) => req.query.minPrice === undefined || Number(req.query.minPrice) <= Number(max))
        .withMessage('minPrice cannot be greater than maxPrice'),
    ],
    { locations: ['query'], message: 'Request contains query parameters that are not allowed' }
  ),
];

module.exports = {
  createGigRules,
  updateGigRules,
  listGigsQueryRules,
};
