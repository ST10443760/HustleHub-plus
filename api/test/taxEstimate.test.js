const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildTaxEstimate, defaultTaxYear } = require('../src/utils/taxEstimate');
const { SUPPORTED_TAX_YEARS } = require('../src/config/tax');

test('defaults to the tax year containing today', () => {
  assert.equal(defaultTaxYear(new Date('2026-11-07T10:00:00Z')), 2026);
  assert.equal(defaultTaxYear(new Date('2026-02-10T10:00:00Z')), 2025);
});

test('falls back to the newest configured year when tables are missing', () => {
  assert.equal(defaultTaxYear(new Date('2031-06-01T10:00:00Z')), SUPPORTED_TAX_YEARS[0]);
});

test('fills every month of the tax year, zeros included', () => {
  const estimate = buildTaxEstimate(2026, [{ month: '2026-10', incomeCents: 75000, bookings: 2 }]);
  assert.equal(estimate.monthly.length, 12);
  assert.deepEqual(estimate.monthly[0], { month: '2026-03', income: 0, bookings: 0 });
  assert.deepEqual(estimate.monthly[7], { month: '2026-10', income: 750, bookings: 2 });
  assert.deepEqual(estimate.monthly[11], { month: '2027-02', income: 0, bookings: 0 });
});

test('adds the months up in cents and estimates the tax', () => {
  // R100 000.10 + R199 999.90 = R300 000 -> the README worked example
  const estimate = buildTaxEstimate(2026, [
    { month: '2026-04', incomeCents: 10000010, bookings: 3 },
    { month: '2027-01', incomeCents: 19999990, bookings: 5 },
  ]);
  assert.deepEqual(estimate.totals, {
    gross: 300000,
    taxBeforeRebate: 58392,
    estimatedTax: 40572,
    takeHome: 259428,
    effectiveRatePercent: 13.52,
  });
  assert.equal(estimate.rebate, 17820);
  assert.equal(estimate.taxFreeThreshold, 99000);
  assert.equal(estimate.breakdown.length, 7);
});

test('ignores rows outside the tax year', () => {
  const estimate = buildTaxEstimate(2026, [{ month: '2027-03', incomeCents: 500000, bookings: 1 }]);
  assert.equal(estimate.totals.gross, 0);
});

test('returns the tax year, assumptions and disclaimer', () => {
  const estimate = buildTaxEstimate(2025);
  assert.deepEqual(estimate.taxYear, {
    label: '1 March 2025 to 28 February 2026 (SARS 2026 tax year)',
    start: '2025-03-01',
    end: '2026-02-28',
  });
  assert.equal(estimate.rebate, 17235);
  assert.ok(estimate.assumptions.length >= 5);
  assert.match(estimate.disclaimer, /not tax advice/);
  assert.deepEqual(estimate.availableTaxYears, SUPPORTED_TAX_YEARS);
});

test('rejects a tax year with no table', () => {
  assert.throws(() => buildTaxEstimate(2019), RangeError);
});
