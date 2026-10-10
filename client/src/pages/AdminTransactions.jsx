import { useSearchParams } from 'react-router-dom';
import { listAllTransactions } from '../api/admin';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessage';
import { formatDate, formatMoney } from '../utils/format';
import { decodeEntities } from '../utils/text';
import useApiData from '../utils/useApiData';

const PAGE_SIZE = 20;

function readPage(searchParams) {
  const page = Number.parseInt(searchParams.get('page'), 10);
  return Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1;
}

// Admin only: every transaction on the platform, newest first.
export default function AdminTransactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = readPage(searchParams);

  const transactions = useApiData(
    (signal) => listAllTransactions({ page, limit: PAGE_SIZE }, signal),
    `admin-transactions-${page}`
  );

  const list = transactions.status === 'ready' ? transactions.data.transactions : [];
  const total = transactions.status === 'ready' ? transactions.data.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToPage(next) {
    setSearchParams(next === 1 ? {} : { page: String(next) });
    window.scrollTo(0, 0);
  }

  return (
    <section aria-labelledby="admin-transactions-title">
      <div className="page-header">
        <h1 id="admin-transactions-title">All transactions</h1>
        <p>A record is created automatically for every booking. Payments are simulated.</p>
      </div>

      {transactions.status === 'loading' && <LoadingState label="Loading transactions…" />}
      {transactions.status === 'error' && (
        <ErrorState message={transactions.error} onRetry={transactions.reload} />
      )}
      {transactions.status === 'ready' && list.length === 0 && <EmptyState title="No transactions yet" />}

      {transactions.status === 'ready' && list.length > 0 && (
        <>
          <p className="field-hint">
            {total} {total === 1 ? 'transaction' : 'transactions'} in total
          </p>
          <div className="table-wrap card">
            <table className="data-table">
              <caption className="visually-hidden">All transactions, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Client</th>
                  <th scope="col">Freelancer</th>
                  <th scope="col" className="amount">
                    Amount
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {list.map((transaction) => (
                  <tr key={transaction.id}>
                    <td data-label="Reference">
                      <span className="reference">{transaction.reference}</span>
                    </td>
                    <td data-label="Client">{transaction.client ? decodeEntities(transaction.client.name) : '-'}</td>
                    <td data-label="Freelancer">
                      {transaction.freelancer ? decodeEntities(transaction.freelancer.name) : '-'}
                    </td>
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
          <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
        </>
      )}
    </section>
  );
}
