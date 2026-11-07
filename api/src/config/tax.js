/**
 * South African income tax tables for resident individuals.
 *
 * Source: SARS, "Rates of Tax for Individuals"
 *   https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/
 * Checked on 2026-11-07 (page marked "Last Updated: 28/10/2026").
 *
 * Tax year in force on the date checked: the SARS 2027 tax year,
 * 1 March 2026 to 28 February 2027.
 *
 * Tables are keyed by the calendar year the tax year STARTS in, the same
 * value the API takes as ?taxYear (2026 means 1 March 2026 to 28 February
 * 2027, which SARS calls the "2027 tax year").
 *
 * Each bracket covers taxable income above `from` up to and including `to`
 * (`to: null` means no upper limit). `baseTax` is the fixed amount SARS
 * prints for the bracket ("44 118 + 26% of taxable income above 245 100");
 * the calculator works the tax out bracket by bracket, and a unit test
 * checks that this gives exactly SARS's printed base amounts.
 *
 * Only the primary rebate is used (taxpayers under 65). The tax-free
 * threshold is the income at which tax equals that rebate.
 *
 * Update this file each February after the Budget speech.
 */

const SOURCE_URL = 'https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/';
const CHECKED_ON = '2026-11-07';

// SARS 2027 tax year (1 March 2026 - 28 February 2027). Announced 25 February 2026.
const TABLE_2027 = {
  sarsTaxYear: 2027,
  brackets: [
    { from: 0, to: 245100, ratePercent: 18, baseTax: 0 },
    { from: 245100, to: 383100, ratePercent: 26, baseTax: 44118 },
    { from: 383100, to: 530200, ratePercent: 31, baseTax: 79998 },
    { from: 530200, to: 695800, ratePercent: 36, baseTax: 125599 },
    { from: 695800, to: 887000, ratePercent: 39, baseTax: 185215 },
    { from: 887000, to: 1878600, ratePercent: 41, baseTax: 259783 },
    { from: 1878600, to: null, ratePercent: 45, baseTax: 666339 },
  ],
  primaryRebate: 17820,
  taxFreeThreshold: 99000,
};

// SARS 2024 tax year (1 March 2023 - 29 February 2024). SARS lists the 2025
// tax year as "No changes from last year" and the 2026 tax year as "No
// changes", so the same brackets, rebate and threshold apply to all three.
const TABLE_2024_TO_2026 = {
  brackets: [
    { from: 0, to: 237100, ratePercent: 18, baseTax: 0 },
    { from: 237100, to: 370500, ratePercent: 26, baseTax: 42678 },
    { from: 370500, to: 512800, ratePercent: 31, baseTax: 77362 },
    { from: 512800, to: 673000, ratePercent: 36, baseTax: 121475 },
    { from: 673000, to: 857900, ratePercent: 39, baseTax: 179147 },
    { from: 857900, to: 1817000, ratePercent: 41, baseTax: 251258 },
    { from: 1817000, to: null, ratePercent: 45, baseTax: 644489 },
  ],
  primaryRebate: 17235,
  taxFreeThreshold: 95750,
};

function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object') deepFreeze(child);
  });
  return Object.freeze(value);
}

const TAX_TABLES = deepFreeze({
  2023: { ...TABLE_2024_TO_2026, sarsTaxYear: 2024 },
  2024: { ...TABLE_2024_TO_2026, sarsTaxYear: 2025 },
  2025: { ...TABLE_2024_TO_2026, sarsTaxYear: 2026 },
  2026: TABLE_2027,
});

// Newest first, e.g. [2026, 2025, 2024, 2023].
const SUPPORTED_TAX_YEARS = Object.freeze(
  Object.keys(TAX_TABLES)
    .map(Number)
    .sort((a, b) => b - a)
);

// Returned with every estimate and shown on the income dashboard.
const TAX_ASSUMPTIONS = Object.freeze([
  'Resident individual under 65, so only the primary rebate applies.',
  'All completed HustleHub+ income in the tax year is treated as taxable income.',
  'No deductions, expenses, medical tax credits or retirement contributions are taken into account.',
  'No UIF, provisional tax payments or other income outside HustleHub+ are included.',
  'Income to date is treated as the full year\'s taxable income; it is not projected forward.',
  'The South African tax year runs from 1 March to the last day of February (dates in SA time).',
]);

const TAX_DISCLAIMER =
  'This is an estimate for planning only, not tax advice and not a SARS assessment. ' +
  'Your actual tax depends on your full financial situation. Check with SARS or a registered tax practitioner.';

module.exports = {
  SOURCE_URL,
  CHECKED_ON,
  TAX_TABLES,
  SUPPORTED_TAX_YEARS,
  TAX_ASSUMPTIONS,
  TAX_DISCLAIMER,
};
