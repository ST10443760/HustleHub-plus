import { listMyBookings } from '../api/bookings';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessage';
import { formatDate, formatMoney } from '../utils/format';
import { decodeEntities } from '../utils/text';
import useApiData from '../utils/useApiData';

// Same endpoint as the client's "My bookings" - for a freelancer the API
// returns bookings on their gigs, with the client's name.
export default function FreelancerBookings() {
  const bookings = useApiData((signal) => listMyBookings(signal), 'freelancer-bookings');
  const list = bookings.status === 'ready' ? bookings.data.bookings : [];

  return (
    <section aria-labelledby="freelancer-bookings-title">
      <div className="page-header">
        <h1 id="freelancer-bookings-title">Bookings on my gigs</h1>
        <p>Every booking a client has made on one of your gigs, newest first.</p>
      </div>

      {bookings.status === 'loading' && <LoadingState label="Loading bookings…" />}
      {bookings.status === 'error' && <ErrorState message={bookings.error} onRetry={bookings.reload} />}

      {bookings.status === 'ready' && list.length === 0 && (
        <EmptyState title="No bookings yet">
          <p>When a client books one of your gigs it will show up here.</p>
        </EmptyState>
      )}

      {bookings.status === 'ready' && list.length > 0 && (
        <div className="table-wrap card">
          <table className="data-table">
            <caption className="visually-hidden">Bookings on your gigs, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Gig</th>
                <th scope="col">Client</th>
                <th scope="col" className="amount">
                  Price
                </th>
                <th scope="col">Booked</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((booking) => (
                <tr key={booking.id}>
                  <td data-label="Gig">{decodeEntities(booking.gigTitle)}</td>
                  <td data-label="Client">{booking.client ? decodeEntities(booking.client.name) : '-'}</td>
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
