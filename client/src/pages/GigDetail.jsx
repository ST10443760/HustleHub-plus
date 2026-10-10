import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getGig, isValidId } from '../api/gigs';
import AdminDeleteGig from '../components/AdminDeleteGig';
import BookingPanel from '../components/BookingPanel';
import { ErrorState, LoadingState } from '../components/StatusMessage';
import useAuth from '../context/useAuth';
import { formatCategory, formatDate, formatDays, formatMoney } from '../utils/format';
import { decodeEntities } from '../utils/text';

function Unavailable() {
  return (
    <section className="card narrow status" aria-labelledby="gig-missing-title">
      <h1 id="gig-missing-title">Gig not available</h1>
      <p>This gig doesn&apos;t exist or is no longer available.</p>
      <Link className="button" to="/gigs">
        Browse other gigs
      </Link>
    </section>
  );
}

export default function GigDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const validId = isValidId(id);

  const [reloadKey, setReloadKey] = useState(0);
  // Each result remembers which request it answers. Until the result for
  // the current id (and retry) arrives, the page shows "loading" - so
  // nothing has to be reset when the id changes.
  const requestKey = `${id}:${reloadKey}`;
  const [result, setResult] = useState({ key: null, status: 'loading', gig: null, error: '' });

  useEffect(() => {
    if (!validId) return undefined;

    const controller = new AbortController();
    const key = `${id}:${reloadKey}`;

    getGig(id, controller.signal)
      .then((data) => setResult({ key, status: 'ready', gig: data.gig, error: '' }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (err.status === 404 || err.status === 400) {
          setResult({ key, status: 'missing', gig: null, error: '' });
        } else {
          setResult({ key, status: 'error', gig: null, error: err.message });
        }
      });

    return () => controller.abort();
  }, [id, validId, reloadKey]);

  const state = result.key === requestKey ? result : { status: 'loading' };

  if (!validId || state.status === 'missing') return <Unavailable />;
  if (state.status === 'loading') return <LoadingState label="Loading gig…" />;
  if (state.status === 'error') {
    return <ErrorState message={state.error} onRetry={() => setReloadKey((key) => key + 1)} />;
  }

  const { gig } = state;
  const title = decodeEntities(gig.title);
  const freelancerName = gig.freelancer ? decodeEntities(gig.freelancer.name) : 'Unknown freelancer';
  const canBook = user && user.role === 'client' && gig.isActive;
  // UI only - the API checks ownership and role again on every change.
  const isOwner = Boolean(user && user.role === 'freelancer' && gig.freelancer && gig.freelancer.id === user.id);
  const isAdmin = Boolean(user && user.role === 'admin');

  return (
    <article className="gig-detail" aria-labelledby="gig-title">
      <p>
        <Link to="/gigs">&larr; Back to gigs</Link>
      </p>

      <div className="card gig-detail">
        <h1 id="gig-title">{title}</h1>
        {!gig.isActive && <span className="badge inactive">Inactive - only you can see this gig</span>}
        <p className="price">{formatMoney(gig.price)}</p>

        <dl className="detail-list">
          <dt>Category</dt>
          <dd>{formatCategory(decodeEntities(gig.category))}</dd>
          <dt>Delivery</dt>
          <dd>{formatDays(gig.deliveryDays)}</dd>
          <dt>Freelancer</dt>
          <dd>{freelancerName}</dd>
          <dt>Listed</dt>
          <dd>{formatDate(gig.createdAt)}</dd>
        </dl>

        <h2>About this gig</h2>
        <p className="gig-description">{decodeEntities(gig.description)}</p>
      </div>

      {isOwner && (
        <div className="button-row">
          <Link className="button secondary" to={`/freelancer/gigs/${gig.id}/edit`}>
            Edit this gig
          </Link>
        </div>
      )}

      {isAdmin && <AdminDeleteGig gigId={gig.id} title={title} />}

      {canBook && (
        <BookingPanel
          gigId={gig.id}
          title={title}
          price={gig.price}
          onUnavailable={() => setResult({ key: requestKey, status: 'missing', gig: null, error: '' })}
        />
      )}
    </article>
  );
}
