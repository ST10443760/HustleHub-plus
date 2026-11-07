const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TAX_TABLES, SUPPORTED_TAX_YEARS, getTaxTable } = require('../src/config/tax');
const { calculateIncomeTax } = require('../src/utils/taxCalculator');

// Guards against typos when the tables are updated each year.
for (const year of SUPPORTED_TAX_YEARS) {
  test(`tax table for the year starting March ${year} is consistent`, () => {
    const table = getTaxTable(year);
    assert.equal(table.sarsTaxYear, year + 1, 'SARS names the year after the year it ends in');

    table.brackets.forEach((bracket, i) => {
      if (i > 0) assert.equal(bracket.from, table.brackets[i - 1].to, 'brackets must be contiguous');
      // Tax at the bottom of each bracket must equal the base amount SARS prints.
      assert.equal(calculateIncomeTax(bracket.from, table).taxBeforeRebate, bracket.baseTax);
    });
    assert.equal(table.brackets[0].from, 0);
    assert.equal(table.brackets[table.brackets.length - 1].to, null);

    // At the threshold, tax before rebate equals the rebate exactly.
    assert.equal(calculateIncomeTax(table.taxFreeThreshold, table).taxBeforeRebate, table.primaryRebate);
  });
}

test('supported years are listed newest first', () => {
  assert.deepEqual(SUPPORTED_TAX_YEARS, [2026, 2025, 2024, 2023]);
});

test('tax tables cannot be changed at runtime', () => {
  assert.ok(Object.isFrozen(TAX_TABLES));
  assert.ok(Object.isFrozen(TAX_TABLES[2026].brackets[0]));
  assert.ok(Object.isFrozen(TAX_TABLES[2023].brackets));
});

test('getTaxTable only returns configured years', () => {
  assert.equal(getTaxTable(2026), TAX_TABLES[2026]);
  assert.equal(getTaxTable(2019), undefined);
  // Nothing inherited from Object.prototype, and no loose matching.
  for (const key of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', '2026', 2026.5, null, undefined]) {
    assert.equal(getTaxTable(key), undefined, `key ${String(key)}`);
  }
});
