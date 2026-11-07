import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getIncome, getTaxEstimate } from '../api/income';
import MonthlyIncomeChart from '../components/MonthlyIncomeChart';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessage';
import TaxBreakdownTable from '../components/TaxBreakdownTable';
import { formatDate, formatMoney, formatPercent } from '../utils/format';
import { decodeEntities } from '../utils/text';
import useApiData from '../utils/useApiData';

const SARS_ORIGIN = 'https://www.sars.gov.za/';

// 2026 -> "2026/27 tax year"
function taxYearOption(year) {
  return `${year}/${String(year + 1).slice(2)} tax year`;
}

// The year a tax year starts in, from its "YYYY-MM-DD" start date.
function startYearOf(estimate) {
  return Number(String(estimate.taxYear.start).slice(0, 4));
}

function StatCard({ label, value, hint }) {
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

function AssumptionsPanel({ estimate }) {
  // Only link to the source if it really is the SARS site.
  const source = estimate.source;
  const sourceUrl = source && typeof source.url === 'string' && source.url.startsWith(SARS_ORIGIN) ? source.url : null;

  return (
    <aside className="card notice" aria-labelledby="assumptions-title">
      <h2 id="assumptions-title">How this estimate works</h2>
      <p>
        Your completed income for the tax year is taxed bracket by bracket using the SARS rates for resident
        individuals, then the primary rebate of {formatMoney(estimate.rebate)} is taken off. If you earn{' '}
        {formatMoney(estimate.taxFreeThreshold)} or less in the year, the estimate is R 0.
      </p>
      <h3>Assumptions</h3>
      <ul>
        {estimate.assumptions.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <p className="disclaimer">
        <strong>Disclaimer:</strong> {estimate.disclaimer}
      </p>
      {sourceUrl && (
        <p className="source">
          Rates:{' '}
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            {source.name}
          </a>
          {source.checkedOn ? ` (checked ${source.checkedOn})` : ''}
        </p>
      )}
    </aside>
  );
}

function TaxDashboard({ estimate }) {
  const { totals } = estimate;
  const bookings = estimate.monthly.reduce((sum, m) => sum + m.bookings, 0);

  return (
    <>
      <div className="stat-row stat-row-4">
        <StatCard
          label="Total earned"
          value={formatMoney(totals.gross)}
          hint={`${bookings} ${bookings === 1 ? 'booking' : 'bookings'} this tax year`}
        />
        <StatCard label="Estimated tax" value={formatMoney(totals.estimatedTax)} hint="After the primary rebate" />
        <StatCard label="Take-home" value={formatMoney(totals.takeHome)} hint="Total earned minus estimated tax" />
        <StatCard label="Effective tax rate" value={formatPercent(totals.effectiveRatePercent)} hint="Estimated tax ÷ total earned" />
      </div>

      <section className="dashboard-section" aria-labelledby="monthly-title">
        <h2 id="monthly-title">Income by month</h2>
        {totals.gross === 0 ? (
          <EmptyState title="No income in this tax year yet">
            <p>Completed bookings between {estimate.taxYear.start} and {estimate.taxYear.end} will show up here.</p>
          </EmptyState>
        ) : (
          <div className="card">
            <MonthlyIncomeChart monthly={estimate.monthly} />
          </div>
        )}
      </section>

      <section className="dashboard-section" aria-labelledby="breakdown-title">
        <h2 id="breakdown-title">Tax by bracket</h2>
        <TaxBreakdownTable breakdown={estimate.breakdown} totals={totals} rebate={estimate.rebate} />
      </section>

      <AssumptionsPanel estimate={estimate} />
    </>
  );
}

function BookingIncome() {
  const income = useApiData((signal) => getIncome(signal), 'income');

  return (
    <section className="dashboard-section" aria-labelledby="per-booking-title">
      <h2 id="per-booking-title">Income per booking</h2>
      {income.status === 'loading' && <LoadingState label="Loading your bookings…" />}
      {income.status === 'error' && <ErrorState message={income.error} onRetry={income.reload} />}
      {income.status === 'ready' &&
        (income.data.items.length === 0 ? (
          <div className="card status">
            <h3>No income yet</h3>
            <p>Once a client books one of your gigs, the payment will show up here.</p>
            <Link className="button secondary" to="/freelancer/gigs">
              Manage my gigs
            </Link>
          </div>
        ) : (
          <>
            <p className="section-note">
              All time: {formatMoney(income.data.totalEarned)} from {income.data.bookingCount}{' '}
              {income.data.bookingCount === 1 ? 'booking' : 'bookings'}, newest first.
            </p>
            <div className="table-wrap card">
              <table className="data-table">
                <caption className="visually-hidden">Income per booking, newest first</caption>
                <thead>
                  <tr>
                    <th scope="col">Gig</th>
                    <th scope="col" className="amount">
                      Amount
                    </th>
                    <th scope="col">Date</th>
                    <th scope="col">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {income.data.items.map((item) => (
                    <tr key={item.bookingId}>
                      <td data-label="Gig">{decodeEntities(item.gigTitle)}</td>
                      <td data-label="Amount" className="amount">
                        {formatMoney(item.amount)}
                      </td>
                      <td data-label="Date">{formatDate(item.date)}</td>
                      <td data-label="Reference">
                        <span className="reference">{item.reference}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}
    </section>
  );
}

// Income dashboard: tax estimate for one SA tax year, monthly chart, tax
// by bracket, assumptions, and the per-booking income table.
export default function Income() {
  // null = let the API pick the tax year that contains today.
  const [taxYear, setTaxYear] = useState(null);
  // Years from the last successful response, so the selector stays put
  // while the next year loads.
  const [years, setYears] = useState([]);
  const estimate = useApiData((signal) => getTaxEstimate(taxYear, signal), `tax-estimate:${taxYear ?? 'current'}`);

  const loadedYears = estimate.status === 'ready' ? estimate.data.availableTaxYears || [] : null;
  if (loadedYears && loadedYears.join() !== years.join()) setYears(loadedYears);

  const shownYear = taxYear ?? (estimate.status === 'ready' ? startYearOf(estimate.data) : '');

  return (
    <section aria-labelledby="income-title">
      <div className="page-header page-header-row">
        <div>
          <h1 id="income-title">Income dashboard</h1>
          <p>What you&apos;ve earned from completed bookings, and an estimate of the income tax on it. Payments are simulated.</p>
        </div>
        {years.length > 0 && (
          <div className="field tax-year-field">
            <label htmlFor="tax-year">Tax year</label>
            <select id="tax-year" value={shownYear} onChange={(event) => setTaxYear(Number(event.target.value))}>
              {years.map((year) => (
                <option key={year} value={year}>
                  {taxYearOption(year)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {estimate.status === 'loading' && <LoadingState label="Loading your income and tax estimate…" />}
      {estimate.status === 'error' && <ErrorState message={estimate.error} onRetry={estimate.reload} />}
      {estimate.status === 'ready' && (
        <>
          <p className="section-note" aria-live="polite">
            Showing {estimate.data.taxYear.label}.
          </p>
          <TaxDashboard estimate={estimate.data} />
        </>
      )}

      <BookingIncome />
    </section>
  );
}
