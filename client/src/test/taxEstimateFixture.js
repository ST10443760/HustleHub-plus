// A tax estimate shaped like GET /api/income/tax-estimate returns it. The
// default is the README worked example: R300 000 in the 2026/27 tax year.
const BRACKETS_2027 = [
  [0, 245100, 18],
  [245100, 383100, 26],
  [383100, 530200, 31],
  [530200, 695800, 36],
  [695800, 887000, 39],
  [887000, 1878600, 41],
  [1878600, null, 45],
];

function months(startYear) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((2 + i) % 12) + 1;
    const year = month >= 3 ? startYear : startYear + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  });
}

export function makeTaxEstimate({ startYear = 2026, monthlyIncome = {}, totals, breakdown } = {}) {
  const income = new Map(
    Object.entries({ [`${startYear}-04`]: [100000.1, 3], [`${startYear + 1}-01`]: [199999.9, 5], ...monthlyIncome })
  );
  return {
    taxYear: {
      label: `1 March ${startYear} to 28 February ${startYear + 1} (SARS ${startYear + 1} tax year)`,
      start: `${startYear}-03-01`,
      end: `${startYear + 1}-02-28`,
    },
    totals: totals || {
      gross: 300000,
      taxBeforeRebate: 58392,
      estimatedTax: 40572,
      takeHome: 259428,
      effectiveRatePercent: 13.52,
    },
    rebate: 17820,
    taxFreeThreshold: 99000,
    breakdown:
      breakdown ||
      BRACKETS_2027.map(([from, to, ratePercent], i) => ({
        from,
        to,
        ratePercent,
        amountInBracket: [245100, 54900].at(i) ?? 0,
        tax: [44118, 14274].at(i) ?? 0,
      })),
    monthly: months(startYear).map((month) => {
      const [amount = 0, bookings = 0] = income.get(month) ?? [];
      return { month, income: amount, bookings };
    }),
    assumptions: ['Resident individual under 65, so only the primary rebate applies.', 'No deductions are taken into account.'],
    disclaimer: 'This is an estimate for planning only, not tax advice and not a SARS assessment.',
    source: {
      name: 'SARS - Rates of Tax for Individuals',
      url: 'https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/',
      checkedOn: '2026-11-07',
    },
    availableTaxYears: [2026, 2025, 2024, 2023],
  };
}

export const emptyTotals = { gross: 0, taxBeforeRebate: 0, estimatedTax: 0, takeHome: 0, effectiveRatePercent: 0 };
