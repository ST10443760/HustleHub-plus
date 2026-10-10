import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyBookings } from '../api/bookings';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessage';
import { formatDate, formatMoney } from '../utils/format';
import { decodeEntities } from '../utils/text';

export default function MyBookings() {
  const [state, setState] = useState({ status: 'loading', bookings: [], error: '' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', bookings: [], error: '' });

    listMyBookings(controller.signal)
      .then((data) => setState({ status: 'ready', bookings: data.bookings, error: '' }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ status: 'error', bookings: [], error: err.message });
      });

    return () => controller.abort();
  }, [reloadKey]);

  return (
    <section aria-labelledby="bookings-title">
      <div className="page-header">
        <h1 id="bookings-title">My bookings</h1>
        <p>Everything you&apos;ve booked, newest first.</p>
      </div>

      {state.status === 'loading' && <LoadingState label="Loading your bookings…" />}
      {state.status === 'error' && (
        <ErrorState message={state.error} onRetry={() => setReloadKey((key) => key + 1)} />
      )}

      {state.status === 'ready' && state.bookings.length === 0 && (
        <EmptyState title="No bookings yet">
          <Link className="button" to="/gigs">
            Browse gigs
          </Link>
        </EmptyState>
      )}

      {state.status === 'ready' && state.bookings.length > 0 && (
        <div className="table-wrap card">
          <table className="data-table">
            <caption className="visually-hidden">Your bookings, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Gig</th>
                <th scope="col">Freelancer</th>
                <th scope="col" className="amount">
                  Price
                </th>
                <th scope="col">Booked</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {state.bookings.map((booking) => (
                <tr key={booking.id}>
                  {/* gigTitle is the title as it was when booked */}
                  <td data-label="Gig">{decodeEntities(booking.gigTitle)}</td>
                  <td data-label="Freelancer">
                    {booking.freelancer ? decodeEntities(booking.freelancer.name) : '-'}
                  </td>
                  <td data-label="Price" className="amount">
                    {formatMoney(booking.price)}
                  </td>
                  <td data-label="Booked">{formatDate(booking.createdAt)}</td>
                  <td data-label="Status">
                    <span className={`status-pill${booking.status === 'confirmed' ? '' : ' muted'}`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
