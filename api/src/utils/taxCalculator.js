const { roundMoney } = require('./money');

/**
 * Estimates South African income tax on a freelancer's income.
 *
 * How it works:
 *   1. The gross income (sum of completed transactions in the tax year) is
 *      treated as taxable income.
 *   2. Each slice of that income is taxed at its bracket's rate (sliding
 *      scale). The sum is the tax before rebate.
 *   3. The primary rebate is subtracted, never going below zero.
 *
 * Assumptions (also returned by the API and shown in the UI): resident
 * individual under 65, no deductions, no medical or retirement credits,
 * no UIF, and income to date is treated as the whole year's taxable income
 * (it is not annualised).
 *
 * Money handling: the income is converted to whole cents first. Tax per
 * bracket is (cents x whole-number rate), an exact integer in hundredths
 * of a cent, so nothing is lost while adding brackets up. The total is
 * rounded to the cent ONCE, half up, at the end. Each breakdown line is
 * rounded to the cent on its own for display, so in rare cases the lines
 * can add up to a cent more or less than the total.
 */

function toCents(amount) {
  return Math.round(roundMoney(amount) * 100);
}

// Hundredths of a cent -> rand, rounded half up to the cent.
function fromRateUnits(units) {
  return Math.round(units / 100) / 100;
}

function assertValidIncome(grossIncome) {
  if (typeof grossIncome !== 'number' || !Number.isFinite(grossIncome)) {
    throw new TypeError('Income must be a finite number');
  }
  if (grossIncome < 0) {
    throw new RangeError('Income cannot be negative');
  }
}

/**
 * @param {number} grossIncome taxable income in rand
 * @param {object} table one entry of TAX_TABLES from config/tax.js
 * @returns {{ gross, taxBeforeRebate, rebate, estimatedTax, takeHome,
 *   effectiveRatePercent, breakdown: Array<{ from, to, ratePercent, amountInBracket, tax }> }}
 */
function calculateIncomeTax(grossIncome, table) {
  assertValidIncome(grossIncome);
  if (!table || !Array.isArray(table.brackets) || table.brackets.length === 0) {
    throw new TypeError('A tax table is required');
  }

  const incomeCents = toCents(grossIncome);
  let taxUnits = 0; // hundredths of a cent

  const breakdown = table.brackets.map(({ from, to, ratePercent }) => {
    const fromCents = from * 100;
    const toCentsLimit = to === null ? Infinity : to * 100;
    const inBracketCents = Math.max(0, Math.min(incomeCents, toCentsLimit) - fromCents);
    const bracketUnits = inBracketCents * ratePercent;
    taxUnits += bracketUnits;

    return {
      from,
      to,
      ratePercent,
      amountInBracket: inBracketCents / 100,
      tax: fromRateUnits(bracketUnits),
    };
  });

  const taxBeforeRebateCents = Math.round(taxUnits / 100);
  const rebateCents = toCents(table.primaryRebate);
  const estimatedTaxCents = Math.max(0, taxBeforeRebateCents - rebateCents);
  const takeHomeCents = incomeCents - estimatedTaxCents;

  return {
    gross: incomeCents / 100,
    taxBeforeRebate: taxBeforeRebateCents / 100,
    rebate: rebateCents / 100,
    estimatedTax: estimatedTaxCents / 100,
    takeHome: takeHomeCents / 100,
    effectiveRatePercent: incomeCents === 0 ? 0 : roundMoney((estimatedTaxCents / incomeCents) * 100),
    breakdown,
  };
}

module.exports = { calculateIncomeTax };
