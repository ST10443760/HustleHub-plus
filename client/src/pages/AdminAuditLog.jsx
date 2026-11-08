import { useSearchParams } from 'react-router-dom';
import { AUDIT_ACTIONS, listAuditLogs } from '../api/admin';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessage';
import { formatDate } from '../utils/format';
import { decodeEntities } from '../utils/text';
import useApiData from '../utils/useApiData';

const PAGE_SIZE = 20;

const ACTION_LABELS = new Map([
  ['admin_gig_deleted', 'Admin deleted a gig'],
  ['admin_gig_deactivated', 'Admin deactivated a gig'],
  ['password_changed', 'Password changed'],
  ['logout_all', 'Signed out of all devices'],
  ['account_locked', 'Account locked'],
]);

function readPage(searchParams) {
  const page = Number.parseInt(searchParams.get('page'), 10);
  return Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1;
}

function readAction(searchParams) {
  const action = searchParams.get('action') || '';
  return AUDIT_ACTIONS.includes(action) ? action : '';
}

function details(entry) {
  const meta = entry.meta || {};
  if (entry.action === 'account_locked' && meta.failedAttempts) {
    return `${meta.failedAttempts} failed attempts, locked ${meta.lockMinutes} min`;
  }
  if (entry.action === 'admin_gig_deactivated') return 'Has bookings, so kept but hidden';
  return '';
}

// Admin only: security-relevant actions, newest first. Entries can't be
// changed or deleted (there is no API for it).
export default function AdminAuditLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = readPage(searchParams);
  const action = readAction(searchParams);

  const logs = useApiData(
    (signal) => listAuditLogs({ page, limit: PAGE_SIZE, action }, signal),
    `admin-audit-${action}-${page}`
  );

  const list = logs.status === 'ready' ? logs.data.logs : [];
  const total = logs.status === 'ready' ? logs.data.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function update(next) {
    const params = {};
    if (next.action) params.action = next.action;
    if (next.page && next.page !== 1) params.page = String(next.page);
    setSearchParams(params);
  }

  return (
    <section aria-labelledby="admin-audit-title">
      <div className="page-header page-header-row">
        <div>
          <h1 id="admin-audit-title">Audit log</h1>
          <p>Security-relevant actions, newest first. Entries are append-only: they can&apos;t be edited or deleted.</p>
        </div>
        <div className="field">
          <label htmlFor="audit-action">Action</label>
          <select id="audit-action" value={action} onChange={(event) => update({ action: event.target.value, page: 1 })}>
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((value) => (
              <option key={value} value={value}>
                {ACTION_LABELS.get(value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {logs.status === 'loading' && <LoadingState label="Loading the audit log…" />}
      {logs.status === 'error' && <ErrorState message={logs.error} onRetry={logs.reload} />}
      {logs.status === 'ready' && list.length === 0 && <EmptyState title="No audit entries yet" />}

      {logs.status === 'ready' && list.length > 0 && (
        <>
          <p className="field-hint">
            {total} {total === 1 ? 'entry' : 'entries'}
          </p>
          <div className="table-wrap card">
            <table className="data-table">
              <caption className="visually-hidden">Audit log, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Action</th>
                  <th scope="col">By</th>
                  <th scope="col">Target</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">IP</th>
                </tr>
              </thead>
              <tbody>
                {list.map((entry) => (
                  <tr key={entry.id}>
                    <td data-label="When">{formatDate(entry.createdAt)}</td>
                    <td data-label="Action">
                      {ACTION_LABELS.get(entry.action) || entry.action}
                      {details(entry) && <span className="field-hint audit-detail">{details(entry)}</span>}
                    </td>
                    <td data-label="By">
                      {entry.actor ? decodeEntities(entry.actor.name) : 'Deleted user'}{' '}
                      <span className="role-badge">{entry.actorRole}</span>
                    </td>
                    <td data-label="Target">
                      {entry.targetType} <span className="reference">{entry.targetId}</span>
                    </td>
                    <td data-label="Outcome">
                      <span className={`status-pill${entry.outcome === 'success' ? '' : ' muted'}`}>{entry.outcome}</span>
                    </td>
                    <td data-label="IP">{entry.ip || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(next) => update({ action, page: next })} />
        </>
      )}
    </section>
  );
}
