import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Shows a one-off message passed through navigation state, e.g.
 * navigate('/freelancer/gigs', { state: { message: 'Gig created.' } }).
 * The state is cleared straight away so the message doesn't come back on
 * a page refresh. Rendered as plain text.
 */
export default function FlashMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message] = useState(() =>
    location.state && typeof location.state.message === 'string' ? location.state.message : ''
  );

  useEffect(() => {
    if (location.state && location.state.message) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location, navigate]);

  if (!message) return null;
  return (
    <p className="alert success" role="status">
      {message}
    </p>
  );
}
