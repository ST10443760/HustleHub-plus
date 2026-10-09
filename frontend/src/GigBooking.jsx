
import { useState } from 'react';

function GigBooking({ gig, onBack }) {
  const [bookingDate, setBookingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  const handleBooking = (e) => {
    e.preventDefault();
    setMessage('');

    if (!bookingDate) {
      setMessage('Please select a booking date.');
      return;
    }

    const selectedDate = new Date(`${bookingDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setMessage('Please select today or a future date.');
      return;
    }

    // This is a frontend-only demonstration.
    // A real booking must be submitted to the backend API.
    setMessage(
      'Booking details validated. Backend booking is not connected yet.'
    );
  };

  return (
    <div className="gig-page">
      <header className="gig-header">
        <h1>HustleHub+</h1>
        <p>Request a gig booking.</p>
      </header>

      <main className="gig-content">
        <button
          type="button"
          className="gig-button"
          onClick={onBack}
          style={{ maxWidth: '180px', marginBottom: '20px' }}
        >
          ← Back to Details
        </button>

        <article className="gig-card">
          <h2>Book: {gig.title}</h2>

          <p>
            <strong>Location:</strong> {gig.location}
          </p>

          <p>
            <strong>Payment:</strong> R{gig.price}
          </p>

          <form onSubmit={handleBooking} className="booking-form">
            <label htmlFor="bookingDate">Preferred booking date</label>
            <input
              id="bookingDate"
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />

            <label htmlFor="bookingNotes">Additional notes (optional)</label>
            <textarea
              id="bookingNotes"
              rows="4"
              placeholder="Add any details about your booking..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button type="submit" className="gig-button">
              Check Booking Details
            </button>
          </form>

          {message && (
            <p role="status" className="booking-message">
              {message}
            </p>
          )}
        </article>
      </main>
    </div>
  );
}

export default GigBooking;
