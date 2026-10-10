import { Link } from 'react-router-dom';

// Placeholder for freelancer and admin pages, which are built next. Keeps
// their nav links working instead of pointing at a broken page.
export default function ComingSoon({ title }) {
  return (
    <section className="card narrow status" aria-labelledby="coming-soon-title">
      <h1 id="coming-soon-title">{title}</h1>
      <p>This page is coming soon.</p>
      <Link className="button secondary" to="/gigs">
        Browse gigs
      </Link>
    </section>
  );
}
