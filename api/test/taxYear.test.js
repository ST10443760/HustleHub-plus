const { test } = require('node:test');
const assert = require('node:assert/strict');
const { taxYearForDate, getTaxYearRange } = require('../src/utils/taxYear');

test('finds the tax year that contains a date', () => {
  assert.equal(taxYearForDate(new Date('2026-11-07T10:00:00Z')), 2026);
  assert.equal(taxYearForDate(new Date('2026-01-15T10:00:00Z')), 2025);
  assert.equal(taxYearForDate(new Date('2026-03-01T10:00:00Z')), 2026);
});

test('switches tax year at midnight South African time, not UTC', () => {
  // 23:59:59 SAST on 28 Feb 2027 is still the 2026 tax year...
  assert.equal(taxYearForDate(new Date('2027-02-28T21:59:59Z')), 2026);
  // ...and 00:00 SAST on 1 March 2027 (still 28 Feb in UTC) is the next one.
  assert.equal(taxYearForDate(new Date('2027-02-28T22:00:00Z')), 2027);
});

test('builds the date range and label for a tax year', () => {
  const range = getTaxYearRange(2026);
  assert.equal(range.start, '2026-03-01');
  assert.equal(range.end, '2027-02-28');
  assert.equal(range.startUtc.toISOString(), '2026-02-28T22:00:00.000Z');
  assert.equal(range.endUtc.toISOString(), '2027-02-28T22:00:00.000Z');
  assert.equal(range.label, '1 March 2026 to 28 February 2027 (SARS 2027 tax year)');
});

test('lists all 12 months from March to February', () => {
  const { months } = getTaxYearRange(2026);
  assert.equal(months.length, 12);
  assert.equal(months[0], '2026-03');
  assert.equal(months[9], '2026-12');
  assert.equal(months[10], '2027-01');
  assert.equal(months[11], '2027-02');
});

test('ends on 29 February in a leap year', () => {
  assert.equal(getTaxYearRange(2027).end, '2028-02-29');
  assert.equal(getTaxYearRange(2023).end, '2024-02-29');
});

test('rejects a tax year that is not a whole year', () => {
  assert.throws(() => getTaxYearRange(2026.5), TypeError);
  assert.throws(() => getTaxYearRange('2026'), TypeError);
  assert.throws(() => getTaxYearRange(undefined), TypeError);
});
