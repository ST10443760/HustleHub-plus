import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyTransactions } from '../api/bookings';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessage';
import { formatDate, formatMoney } from '../utils/format';
import { decodeEntities } from '../utils/text';

export default function MyTransactions() {
  const [state, setState] = useState({ status: 'loading', transactions: [], error: '' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    listMyTransactions(controller.signal)
      .then((data) => setState({ status: 'ready', transactions: data.transactions, error: '' }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ status: 'error', transactions: [], error: err.message });
      });

    return () => controller.abort();
  }, [reloadKey]);

  return (
    <section aria-labelledby="transactions-title">
      <div className="page-header">
        <h1 id="transactions-title">My transactions</h1>
        <p>A payment record is created for every booking. Payments are simulated.</p>
      </div>

      {state.status === 'loading' && <LoadingState label="Loading your transactions…" />}
      {state.status === 'error' && (
        <ErrorState
          message={state.error}
          onRetry={() => {
            setState({ status: 'loading', transactions: [], error: '' });
            setReloadKey((key) => key + 1);
          }}
        />
      )}

      {state.status === 'ready' && state.transactions.length === 0 && (
        <EmptyState title="No transactions yet">
          <p>Transactions appear here once you book a gig.</p>
          <Link className="button" to="/gigs">
            Browse gigs
          </Link>
        </EmptyState>
      )}

      {state.status === 'ready' && state.transactions.length > 0 && (
        <div className="table-wrap card">
          <table className="data-table">
            <caption className="visually-hidden">Your transactions, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Gig</th>
                <th scope="col" className="amount">
                  Amount
                </th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {state.transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td data-label="Reference">
                    <span className="reference">{transaction.reference}</span>
                  </td>
                  <td data-label="Gig">{transaction.gig ? decodeEntities(transaction.gig.title) : '-'}</td>
                  <td data-label="Amount" className="amount">
                    {formatMoney(transaction.amount)}
                  </td>
                  <td data-label="Status">
                    <span className={`status-pill${transaction.status === 'completed' ? '' : ' muted'}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td data-label="Date">{formatDate(transaction.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
