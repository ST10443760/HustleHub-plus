const {
  TAX_TABLES,
  SUPPORTED_TAX_YEARS,
  TAX_ASSUMPTIONS,
  TAX_DISCLAIMER,
  SOURCE_URL,
  CHECKED_ON,
} = require('../config/tax');
const { calculateIncomeTax } = require('./taxCalculator');
const { getTaxYearRange, taxYearForDate } = require('./taxYear');

/**
 * Pure helpers behind GET /api/income/tax-estimate, kept out of the
 * controller so they can be unit tested without a database.
 */

// The tax year containing `now`. If SARS tables for it haven't been added
// to config/tax.js yet (e.g. just after 1 March), falls back to the newest
// configured year rather than guessing new rates.
function defaultTaxYear(now = new Date()) {
  const current = taxYearForDate(now);
  return TAX_TABLES[current] ? current : SUPPORTED_TAX_YEARS[0];
}

/**
 * @param {number} startYear tax year start, must be in TAX_TABLES
 * @param {Array<{ month: string, incomeCents: number, bookings: number }>} monthlyRows
 *   one row per month that had income ("YYYY-MM"), amounts in whole cents
 */
function buildTaxEstimate(startYear, monthlyRows = []) {
  const table = TAX_TABLES[startYear];
  if (!table) throw new RangeError(`No tax table configured for ${startYear}`);

  const range = getTaxYearRange(startYear);
  const byMonth = new Map(monthlyRows.map((row) => [row.month, row]));

  // Every month of the tax year, March to February, zeros included.
  // Rows outside the tax year are ignored.
  let grossCents = 0;
  const monthly = range.months.map((month) => {
    const row = byMonth.get(month);
    const incomeCents = row ? row.incomeCents : 0;
    grossCents += incomeCents;
    return { month, income: incomeCents / 100, bookings: row ? row.bookings : 0 };
  });

  const result = calculateIncomeTax(grossCents / 100, table);

  return {
    taxYear: { label: range.label, start: range.start, end: range.end },
    totals: {
      gross: result.gross,
      taxBeforeRebate: result.taxBeforeRebate,
      estimatedTax: result.estimatedTax,
      takeHome: result.takeHome,
      effectiveRatePercent: result.effectiveRatePercent,
    },
    rebate: result.rebate,
    taxFreeThreshold: table.taxFreeThreshold,
    breakdown: result.breakdown,
    monthly,
    assumptions: [...TAX_ASSUMPTIONS],
    disclaimer: TAX_DISCLAIMER,
    source: { name: 'SARS - Rates of Tax for Individuals', url: SOURCE_URL, checkedOn: CHECKED_ON },
    availableTaxYears: [...SUPPORTED_TAX_YEARS],
  };
}

module.exports = { defaultTaxYear, buildTaxEstimate };
