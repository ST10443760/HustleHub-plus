import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createBooking } from '../api/bookings';
import { formatMoney } from '../utils/format';

/**
 * Book -> confirm (simulated payment) -> done.
 *
 * Only { gigId } is sent: the API takes the price and freelancer from the
 * database. A ref guards against a double click booking twice, on top of
 * disabling the button while the request is in flight.
 */
export default function BookingPanel({ gigId, title, price, onUnavailable }) {
  const [step, setStep] = useState('idle'); // idle | confirm | sending | done
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const sendingRef = useRef(false);

  async function confirmBooking() {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setStep('sending');
    setError('');

    try {
      const result = await createBooking(gigId);
      setReference(result.transaction.reference);
      setStep('done');
    } catch (err) {
      if (err.status === 404) {
        onUnavailable(); // the gig was removed or deactivated meanwhile
        return;
      }
      // 429 carries the API's "try again in N seconds" message; network
      // errors carry a generic connection message.
      setError(err.message);
      setStep('confirm');
    } finally {
      sendingRef.current = false;
    }
  }

  if (step === 'done') {
    return (
      <div className="card alert success" role="status" aria-live="polite">
        <h2>Booking confirmed</h2>
        <p>
          Your booking reference is <span className="reference">{reference}</span>.
        </p>
        <p>Payment was simulated - no real money was charged.</p>
        <Link className="button" to="/bookings">
          View my bookings
        </Link>
      </div>
    );
  }

  if (step === 'idle') {
    return (
      <div>
        <button type="button" className="button" onClick={() => setStep('confirm')}>
          Book this gig
        </button>
      </div>
    );
  }

  const sending = step === 'sending';

  return (
    <div className="card confirm-panel" role="region" aria-labelledby="confirm-booking-title">
      <h2 id="confirm-booking-title">Confirm your booking</h2>
      <dl className="detail-list">
        <dt>Gig</dt>
        <dd>{title}</dd>
        <dt>Price</dt>
        <dd>{formatMoney(price)}</dd>
      </dl>
      <p className="alert info">Payment is simulated. You won&apos;t be charged any real money.</p>

      <div aria-live="assertive">
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="button-row">
        <button type="button" className="button" onClick={confirmBooking} disabled={sending}>
          {sending ? 'Booking…' : 'Confirm booking'}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setStep('idle');
            setError('');
          }}
          disabled={sending}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
