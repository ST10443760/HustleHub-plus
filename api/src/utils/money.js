/**
 * Rounds an amount to 2 decimal places. Money is stored as a plain Number
 * (easy to sum and aggregate), so every stored amount and every total goes
 * through this to keep floating point noise like 0.1 + 0.2 = 0.30000000000000004
 * out of the data.
 */
function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

module.exports = { roundMoney };
