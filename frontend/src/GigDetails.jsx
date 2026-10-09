
import { useState } from 'react';
import GigBooking from './GigBooking.jsx';

function GigDetails({ gig, onBack }) {
  const [showBooking, setShowBooking] = useState(false);

  if (!gig) {
    return (
      <div className="gig-content">
        <p>Gig not found.</p>
        <button type="button" onClick={onBack}>
          Back to Gigs
        </button>
      </div>
    );
  }

  // Show the booking form when the user clicks Book This Gig
  if (showBooking) {
    return (
      <GigBooking
        gig={gig}
        onBack={() => setShowBooking(false)}
      />
    );
  }

  return (
    <div className="gig-page">
      <header className="gig-header">
        <h1>HustleHub+</h1>
        <p>Explore this opportunity.</p>
      </header>

      <main className="gig-content">
        <button
          type="button"
          className="gig-button"
          onClick={onBack}
          style={{ maxWidth: '180px', marginBottom: '20px' }}
        >
          ← Back to Gigs
        </button>

        <article className="gig-card">
          <span className="gig-category">{gig.category}</span>

          <h2>{gig.title}</h2>

          <p>{gig.description}</p>

          <p>
            <strong>Location:</strong> {gig.location}
          </p>

          <p>
            <strong>Payment:</strong> R{gig.price}
          </p>

          <p>
            <strong>Gig ID:</strong> {gig.id}
          </p>

          <button
            type="button"
            className="gig-button"
            onClick={() => setShowBooking(true)}
          >
            Book This Gig
          </button>
        </article>
      </main>
    </div>
  );
}

export default GigDetails;
