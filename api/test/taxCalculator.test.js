const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateIncomeTax } = require('../src/utils/taxCalculator');
const { TAX_TABLES } = require('../src/config/tax');

// SARS 2027 tax year (1 March 2026 - 28 February 2027).
// Brackets: 18% to 245 100, 26% to 383 100, 31% to 530 200, 36% to 695 800,
// 39% to 887 000, 41% to 1 878 600, 45% above. Primary rebate 17 820.
const table = TAX_TABLES[2026];
const tax = (income) => calculateIncomeTax(income, table);

describe('worked example (same numbers as the README)', () => {
  test('R300 000 income in the 2027 tax year', () => {
    // 44 118 + 26% x (300 000 - 245 100) = 44 118 + 14 274 = 58 392
    // 58 392 - 17 820 rebate = 40 572 tax; 300 000 - 40 572 = 259 428
    // 40 572 / 300 000 = 13.524% -> 13.52%
    const result = tax(300000);
    assert.equal(result.gross, 300000);
    assert.equal(result.taxBeforeRebate, 58392);
    assert.equal(result.rebate, 17820);
    assert.equal(result.estimatedTax, 40572);
    assert.equal(result.takeHome, 259428);
    assert.equal(result.effectiveRatePercent, 13.52);
    assert.deepEqual(result.breakdown.slice(0, 3), [
      { from: 0, to: 245100, ratePercent: 18, amountInBracket: 245100, tax: 44118 },
      { from: 245100, to: 383100, ratePercent: 26, amountInBracket: 54900, tax: 14274 },
      { from: 383100, to: 530200, ratePercent: 31, amountInBracket: 0, tax: 0 },
    ]);
  });
});

describe('zero and low incomes', () => {
  test('zero income gives zero everything', () => {
    const result = tax(0);
    assert.equal(result.taxBeforeRebate, 0);
    assert.equal(result.estimatedTax, 0);
    assert.equal(result.takeHome, 0);
    assert.equal(result.effectiveRatePercent, 0);
    assert.ok(result.breakdown.every((line) => line.amountInBracket === 0 && line.tax === 0));
  });

  test('income below the tax-free threshold pays no tax', () => {
    const result = tax(50000);
    assert.equal(result.taxBeforeRebate, 9000);
    assert.equal(result.estimatedTax, 0);
    assert.equal(result.takeHome, 50000);
  });

  test('income exactly on the threshold pays no tax', () => {
    const result = tax(table.taxFreeThreshold);
    assert.equal(result.taxBeforeRebate, 17820);
    assert.equal(result.estimatedTax, 0);
  });

  test('R1 above the threshold pays 18 cents', () => {
    assert.equal(tax(99001).estimatedTax, 0.18);
  });
});

describe('bracket boundaries match the SARS base amounts', () => {
  const boundaries = [
    [245100, 44118],
    [383100, 79998],
    [530200, 125599],
    [695800, 185215],
    [887000, 259783],
    [1878600, 666339],
  ];
  for (const [income, sarsTax] of boundaries) {
    test(`R${income}`, () => {
      const result = tax(income);
      assert.equal(result.taxBeforeRebate, sarsTax);
      assert.equal(result.estimatedTax, sarsTax - 17820);
    });
  }
});

describe('inside every bracket', () => {
  // [income, tax before rebate], worked out from the SARS table by hand
  const cases = [
    [200000, 36000], // 18% x 200 000
    [300000, 58392], // 44 118 + 26% x 54 900
    [450000, 100737], // 79 998 + 31% x 66 900
    [600000, 150727], // 125 599 + 36% x 69 800
    [800000, 225853], // 185 215 + 39% x 104 200
    [1000000, 306113], // 259 783 + 41% x 113 000
    [2000000, 720969], // 666 339 + 45% x 121 400
  ];
  for (const [income, before] of cases) {
    test(`R${income}`, () => {
      const result = tax(income);
      assert.equal(result.taxBeforeRebate, before);
      assert.equal(result.estimatedTax, before - 17820);
      assert.equal(result.takeHome, income - (before - 17820));
    });
  }
});

test('a high income is taxed at 45% at the top', () => {
  // 666 339 + 45% x 3 121 400 = 2 070 969; less 17 820 = 2 053 149
  const result = tax(5000000);
  assert.equal(result.taxBeforeRebate, 2070969);
  assert.equal(result.estimatedTax, 2053149);
  assert.equal(result.effectiveRatePercent, 41.06);
  const top = result.breakdown[result.breakdown.length - 1];
  assert.equal(top.to, null);
  assert.equal(top.amountInBracket, 3121400);
  assert.equal(top.tax, 1404630);
});

describe('rounding', () => {
  test('rounds half a cent up', () => {
    // 18% of 25 cents = 4.5 cents -> 5 cents
    assert.equal(tax(0.25).taxBeforeRebate, 0.05);
  });

  test('rounds the total once, to the cent', () => {
    // 18% x 100 000.55 = 18 000.099 -> 18 000.10; less 17 820 = 180.10
    const result = tax(100000.55);
    assert.equal(result.taxBeforeRebate, 18000.1);
    assert.equal(result.estimatedTax, 180.1);
    assert.equal(result.takeHome, 99820.45);
    assert.equal(result.effectiveRatePercent, 0.18);
  });

  test('rounds the income to the cent first', () => {
    assert.equal(tax(1000.005).gross, 1000.01);
  });

  test('summing many small amounts does not drift', () => {
    let total = 0;
    for (let i = 0; i < 10; i += 1) total += 0.1; // 0.9999999999999999
    assert.equal(tax(total).gross, 1);
  });

  test('bracket amounts always add up to the income', () => {
    const result = tax(1234567.89);
    const sumCents = result.breakdown.reduce((sum, line) => sum + Math.round(line.amountInBracket * 100), 0);
    assert.equal(sumCents, 123456789);
  });
});

describe('rejects invalid input', () => {
  test('negative income', () => {
    assert.throws(() => tax(-1), RangeError);
  });
  test('NaN and Infinity', () => {
    assert.throws(() => tax(NaN), TypeError);
    assert.throws(() => tax(Infinity), TypeError);
  });
  test('a string, even a numeric one', () => {
    assert.throws(() => tax('1000'), TypeError);
  });
  test('missing income', () => {
    assert.throws(() => tax(undefined), TypeError);
    assert.throws(() => tax(null), TypeError);
  });
  test('missing tax table', () => {
    assert.throws(() => calculateIncomeTax(1000), TypeError);
    assert.throws(() => calculateIncomeTax(1000, { brackets: [] }), TypeError);
  });
});
