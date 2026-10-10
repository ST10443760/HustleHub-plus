import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import useAuth from '../context/useAuth';
import { REGISTER_ROLES } from '../utils/constants';
import { validateRegister } from '../utils/validation';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user && !submitting) {
    return <Navigate to="/gigs" replace />;
  }

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    // Same rules as the API (trimmed name and email; the password is sent as typed).
    const values = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
    };
    const fieldErrors = validateRegister(values);
    setErrors(fieldErrors);
    setFormError('');
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      await register(values);
      navigate('/gigs', { replace: true });
    } catch (err) {
      // The API's own message (duplicate email, rate limit, validation).
      setFormError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <section className="card narrow" aria-labelledby="register-title">
      <h1 id="register-title">Create an account</h1>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div aria-live="assertive">
          {formError && (
            <p className="alert error" role="alert">
              {formError}
            </p>
          )}
        </div>

        <FormField
          id="register-name"
          label="Name"
          autoComplete="name"
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          hint="2 to 60 characters"
          maxLength={60}
          required
        />
        <FormField
          id="register-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
        />
        <FormField
          id="register-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 8 characters, including a number"
          required
        />

        <div className="field">
          <fieldset aria-describedby={errors.role ? 'register-role-error' : undefined}>
            <legend>I am a…</legend>
            {REGISTER_ROLES.map((option) => (
              <label key={option.value} className="radio-option">
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={form.role === option.value}
                  onChange={update('role')}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          <span id="register-role-error" className="field-error" aria-live="polite">
            {errors.role}
          </span>
        </div>

        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="form-footer">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}
