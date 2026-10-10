import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import useAuth from '../context/useAuth';
import { validateLogin } from '../utils/validation';

const LOGIN_FAILED = 'Invalid email or password';

// Only send the user back to a page inside this app (never "//evil.example").
function safeReturnPath(from) {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return null;
  if (from.startsWith('/login') || from.startsWith('/register')) return null;
  return from;
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const returnTo = safeReturnPath(location.state && location.state.from);
  const sessionExpired = Boolean(location.state && location.state.expired);

  if (user && !submitting) {
    return <Navigate to={returnTo || '/gigs'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const values = { email: email.trim(), password };
    const fieldErrors = validateLogin(values);
    setErrors(fieldErrors);
    setFormError('');
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(values.email, values.password);
      navigate(returnTo || '/gigs', { replace: true });
    } catch (err) {
      // Rate limit and connection problems get their own message; every
      // other failure shows the same generic one, like the API does.
      if (err.status === 429 || err.status === 0 || err.status >= 500) {
        setFormError(err.message);
      } else {
        setFormError(LOGIN_FAILED);
      }
      setSubmitting(false);
    }
  }

  return (
    <section className="card narrow" aria-labelledby="login-title">
      <h1 id="login-title">Log in</h1>

      {sessionExpired && !formError && (
        <p className="alert info" role="status">
          Your session has ended. Please log in again.
        </p>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div aria-live="assertive">
          {formError && (
            <p className="alert error" role="alert">
              {formError}
            </p>
          )}
        </div>

        <FormField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <FormField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />

        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="form-footer">
        New to HustleHub+? <Link to="/register">Create an account</Link>
      </p>
    </section>
  );
}
