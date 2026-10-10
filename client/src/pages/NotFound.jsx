import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="card narrow status" aria-labelledby="not-found-title">
      <h1 id="not-found-title">Page not found</h1>
      <p>There&apos;s nothing at this address.</p>
      <Link className="button" to="/">
        Go home
      </Link>
    </section>
  );
}
