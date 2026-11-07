import { formatMoney, formatWholeRand } from '../utils/format';

// "R 245 100 to R 383 100", or "Above R 1 878 600" for the top bracket.
function bracketLabel({ from, to }) {
  if (to === null || to === undefined) return `Above ${formatWholeRand(from)}`;
  return `${formatWholeRand(from)} to ${formatWholeRand(to)}`;
}

/**
 * Tax worked out bracket by bracket (sliding scale), then the primary
 * rebate, giving the estimated tax. Brackets the income doesn't reach are
 * shown as R 0,00 so the whole table is visible.
 */
export default function TaxBreakdownTable({ breakdown, totals, rebate }) {
  return (
    <div className="table-wrap card">
      <table className="data-table">
        <caption className="visually-hidden">Estimated tax by bracket</caption>
        <thead>
          <tr>
            <th scope="col">Taxable income</th>
            <th scope="col" className="amount">
              Rate
            </th>
            <th scope="col" className="amount">
              Your income in bracket
            </th>
            <th scope="col" className="amount">
              Tax
            </th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((line) => (
            <tr key={line.from} className={line.amountInBracket > 0 ? undefined : 'row-muted'}>
              <td data-label="Taxable income">{bracketLabel(line)}</td>
              <td data-label="Rate" className="amount">
                {line.ratePercent}%
              </td>
              <td data-label="Your income in bracket" className="amount">
                {formatMoney(line.amountInBracket)}
              </td>
              <td data-label="Tax" className="amount">
                {formatMoney(line.tax)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              Tax before rebate
            </th>
            <td data-label="Tax before rebate" className="amount">
              {formatMoney(totals.taxBeforeRebate)}
            </td>
          </tr>
          <tr>
            <th scope="row" colSpan={3}>
              Less primary rebate
            </th>
            <td data-label="Less primary rebate" className="amount">
              -{formatMoney(rebate)}
            </td>
          </tr>
          <tr className="row-total">
            <th scope="row" colSpan={3}>
              Estimated tax (never below zero)
            </th>
            <td data-label="Estimated tax" className="amount">
              {formatMoney(totals.estimatedTax)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
