import { Link } from 'react-router-dom';

export default function NotAllowed() {
  return (
    <section className="card narrow status" aria-labelledby="not-allowed-title">
      <h1 id="not-allowed-title">Not allowed</h1>
      <p>Your account doesn&apos;t have access to this page.</p>
      <Link className="button" to="/gigs">
        Go to gigs
      </Link>
    </section>
  );
}
