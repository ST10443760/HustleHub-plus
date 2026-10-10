import { Link } from 'react-router-dom';
import { getIncome } from '../api/income';
import { ErrorState, LoadingState } from '../components/StatusMessage';
import { formatDate, formatMoney } from '../utils/format';
import { decodeEntities } from '../utils/text';
import useApiData from '../utils/useApiData';

// Totals and per-booking income from completed transactions. Charts come in Part 3.
export default function Income() {
  const income = useApiData((signal) => getIncome(signal), 'income');

  return (
    <section aria-labelledby="income-title">
      <div className="page-header">
        <h1 id="income-title">Income</h1>
        <p>What you&apos;ve earned from completed bookings. Payments are simulated.</p>
      </div>

      {income.status === 'loading' && <LoadingState label="Loading your income…" />}
      {income.status === 'error' && <ErrorState message={income.error} onRetry={income.reload} />}

      {income.status === 'ready' && (
        <>
          <div className="stat-row">
            <div className="card stat">
              <span className="stat-label">Total earned</span>
              <span className="stat-value">{formatMoney(income.data.totalEarned)}</span>
            </div>
            <div className="card stat">
              <span className="stat-label">Bookings</span>
              <span className="stat-value">{income.data.bookingCount}</span>
            </div>
          </div>

          {income.data.items.length === 0 ? (
            <div className="card status">
              <h2>No income yet</h2>
              <p>Once a client books one of your gigs, the payment will show up here.</p>
              <Link className="button secondary" to="/freelancer/gigs">
                Manage my gigs
              </Link>
            </div>
          ) : (
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
          )}
        </>
      )}
    </section>
  );
}
