import { Link, Navigate } from 'react-router-dom';
import useAuth from '../context/useAuth';
import { LoadingState } from '../components/StatusMessage';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;
  if (user) return <Navigate to="/gigs" replace />;

  return (
    <section className="card narrow" aria-labelledby="home-title">
      <h1 id="home-title">Book trusted freelancers</h1>
      <p>
        HustleHub+ connects clients with freelancers for design, writing, development, marketing and
        video work. Browse gigs, book in a couple of clicks, and keep track of every booking.
      </p>
      <div className="button-row">
        <Link className="button" to="/register">
          Create an account
        </Link>
        <Link className="button secondary" to="/login">
          Log in
        </Link>
      </div>
    </section>
  );
}
