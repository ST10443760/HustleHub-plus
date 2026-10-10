import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteGig, listMyGigs, setGigActive } from '../api/gigs';
import ConfirmAction from '../components/ConfirmAction';
import FlashMessage from '../components/FlashMessage';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessage';
import { formatCategory, formatDays, formatMoney } from '../utils/format';
import { decodeEntities } from '../utils/text';
import useApiData from '../utils/useApiData';

export default function MyGigs() {
  const gigs = useApiData((signal) => listMyGigs(signal), 'my-gigs');

  const [busyId, setBusyId] = useState(null); // gig with a request in flight
  const [confirmingId, setConfirmingId] = useState(null); // gig awaiting "delete?" confirmation
  const [notice, setNotice] = useState({ type: '', text: '' });

  async function toggleActive(gig) {
    if (busyId) return;
    setBusyId(gig.id);
    setNotice({ type: '', text: '' });
    try {
      await setGigActive(gig.id, !gig.isActive);
      setNotice({
        type: 'success',
        text: `"${decodeEntities(gig.title)}" is now ${gig.isActive ? 'inactive' : 'active'}.`,
      });
      gigs.reload();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete(gig) {
    if (busyId) return;
    setBusyId(gig.id);
    setNotice({ type: '', text: '' });
    try {
      const result = await deleteGig(gig.id);
      // The API says which happened: deleted, or deactivated because the
      // gig has bookings.
      setNotice({ type: result.deleted ? 'success' : 'info', text: result.message });
      setConfirmingId(null);
      gigs.reload();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  const list = gigs.status === 'ready' ? gigs.data.gigs : [];
  const confirming = list.find((gig) => gig.id === confirmingId);

  return (
    <section aria-labelledby="my-gigs-title">
      <div className="page-header page-header-row">
        <div>
          <h1 id="my-gigs-title">My gigs</h1>
          <p>Create, edit and manage the gigs you offer.</p>
        </div>
        <Link className="button" to="/freelancer/gigs/new">
          New gig
        </Link>
      </div>

      <FlashMessage />
      <div aria-live="polite">
        {notice.text && (
          <p className={`alert ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}
      </div>

      {confirming && (
        <ConfirmAction
          title="Delete this gig?"
          confirmLabel="Delete gig"
          busyLabel="Deleting…"
          busy={busyId === confirming.id}
          onConfirm={() => confirmDelete(confirming)}
          onCancel={() => setConfirmingId(null)}
        >
          <p>
            <strong>{decodeEntities(confirming.title)}</strong> will be deleted. If it already has bookings it
            will be deactivated instead, so the booking history stays intact.
          </p>
        </ConfirmAction>
      )}

      {gigs.status === 'loading' && <LoadingState label="Loading your gigs…" />}
      {gigs.status === 'error' && <ErrorState message={gigs.error} onRetry={gigs.reload} />}

      {gigs.status === 'ready' && list.length === 0 && (
        <EmptyState title="You haven't created any gigs yet">
          <Link className="button" to="/freelancer/gigs/new">
            Create your first gig
          </Link>
        </EmptyState>
      )}

      {gigs.status === 'ready' && list.length > 0 && (
        <div className="table-wrap card">
          <table className="data-table">
            <caption className="visually-hidden">Your gigs</caption>
            <thead>
              <tr>
                <th scope="col">Gig</th>
                <th scope="col">Category</th>
                <th scope="col">Delivery</th>
                <th scope="col" className="amount">
                  Price
                </th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((gig) => {
                const title = decodeEntities(gig.title);
                const busy = busyId === gig.id;
                return (
                  <tr key={gig.id}>
                    <td data-label="Gig">
                      <Link to={`/gigs/${gig.id}`}>{title}</Link>
                    </td>
                    <td data-label="Category">{formatCategory(decodeEntities(gig.category))}</td>
                    <td data-label="Delivery">{formatDays(gig.deliveryDays)}</td>
                    <td data-label="Price" className="amount">
                      {formatMoney(gig.price)}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${gig.isActive ? 'active' : 'inactive'}`}>
                        {gig.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <div className="actions-cell">
                        <Link className="button secondary small" to={`/freelancer/gigs/${gig.id}/edit`}>
                          Edit<span className="visually-hidden"> {title}</span>
                        </Link>
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => toggleActive(gig)}
                          disabled={busy}
                        >
                          {gig.isActive ? 'Deactivate' : 'Activate'}
                          <span className="visually-hidden"> {title}</span>
                        </button>
                        <button
                          type="button"
                          className="button danger small"
                          onClick={() => setConfirmingId(gig.id)}
                          disabled={busy}
                        >
                          Delete<span className="visually-hidden"> {title}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
