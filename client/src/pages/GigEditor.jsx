import { Link, useNavigate, useParams } from 'react-router-dom';
import { createGig, getGig, isValidId, updateGig } from '../api/gigs';
import GigForm from '../components/GigForm';
import { ErrorState, LoadingState } from '../components/StatusMessage';
import useAuth from '../context/useAuth';
import { decodeEntities } from '../utils/text';
import useApiData from '../utils/useApiData';

const noGig = () => Promise.resolve(null);

// API text is escaped; the form needs the plain text the freelancer typed.
function toFormValues(gig) {
  return {
    title: decodeEntities(gig.title),
    description: decodeEntities(gig.description),
    price: String(gig.price),
    category: decodeEntities(gig.category),
    deliveryDays: String(gig.deliveryDays),
  };
}

function Missing({ message }) {
  return (
    <section className="card narrow status">
      <h1>Can&apos;t edit this gig</h1>
      <p>{message}</p>
      <Link className="button" to="/freelancer/gigs">
        Back to my gigs
      </Link>
    </section>
  );
}

// /freelancer/gigs/new and /freelancer/gigs/:id/edit
export default function GigEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const editing = id !== undefined;
  const validId = !editing || isValidId(id);

  const gigData = useApiData((signal) => (editing && validId ? getGig(id, signal) : noGig()), id || 'new');

  async function handleCreate(values) {
    await createGig(values);
    navigate('/freelancer/gigs', { state: { message: 'Gig created.' } });
  }

  async function handleUpdate(values) {
    await updateGig(id, values);
    navigate('/freelancer/gigs', { state: { message: 'Gig updated.' } });
  }

  if (!editing) {
    return (
      <section aria-labelledby="new-gig-title">
        <div className="page-header">
          <h1 id="new-gig-title">New gig</h1>
          <p>Describe what you offer. Clients will see this on the gig page.</p>
        </div>
        <GigForm submitLabel="Create gig" busyLabel="Creating…" onSubmit={handleCreate} />
      </section>
    );
  }

  if (!validId) return <Missing message="This gig doesn't exist." />;
  if (gigData.status === 'loading') return <LoadingState label="Loading gig…" />;
  if (gigData.status === 'error') {
    if (gigData.errorStatus === 404 || gigData.errorStatus === 400) {
      return <Missing message="This gig doesn't exist or is no longer available." />;
    }
    return <ErrorState message={gigData.error} onRetry={gigData.reload} />;
  }

  const { gig } = gigData.data;
  // The API is what actually blocks editing someone else's gig (403); this
  // just avoids showing a form that can't be saved.
  if (!gig.freelancer || gig.freelancer.id !== user.id) {
    return <Missing message="You can only edit your own gigs." />;
  }

  return (
    <section aria-labelledby="edit-gig-title">
      <div className="page-header">
        <h1 id="edit-gig-title">Edit gig</h1>
        <p>
          <Link to="/freelancer/gigs">&larr; Back to my gigs</Link>
        </p>
      </div>
      <GigForm
        key={gig.id}
        initialValues={toFormValues(gig)}
        submitLabel="Save changes"
        busyLabel="Saving…"
        onSubmit={handleUpdate}
      />
    </section>
  );
}
