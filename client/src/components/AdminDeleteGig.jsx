import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminDeleteGig } from '../api/admin';
import ConfirmAction from './ConfirmAction';

// Admin-only removal from the gig page. The API decides whether the gig is
// deleted or (if it has bookings) deactivated, and says which; that message
// is shown on the gig list afterwards.
export default function AdminDeleteGig({ gigId, title }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);

  async function handleConfirm() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await adminDeleteGig(gigId);
      navigate('/gigs', { replace: true, state: { message: result.message } });
    } catch (err) {
      setError(err.status === 404 ? 'This gig no longer exists.' : err.message);
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <div>
        <button type="button" className="button danger" onClick={() => setConfirming(true)}>
          Delete as admin
        </button>
      </div>
    );
  }

  return (
    <ConfirmAction
      title="Delete this gig as admin?"
      confirmLabel="Delete gig"
      busyLabel="Deleting…"
      busy={busy}
      error={error}
      onConfirm={handleConfirm}
      onCancel={() => {
        setConfirming(false);
        setError('');
      }}
    >
      <p>
        <strong>{title}</strong> will be removed. If it has bookings it will be deactivated instead, so the booking
        and transaction history stays intact.
      </p>
    </ConfirmAction>
  );
}
