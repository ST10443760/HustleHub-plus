import { useRef, useState } from 'react';
import ConfirmAction from '../components/ConfirmAction';
import FormField from '../components/FormField';
import useAuth from '../context/useAuth';
import { validateChangePassword } from '../utils/validation';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Account page, for every role: change password and sign out of all devices.
 *
 * Passwords are never kept in React state. The inputs are uncontrolled; their
 * values are read from the form only when it is submitted, sent, and the form
 * is cleared as soon as the change succeeds.
 */
export default function Account() {
  const { user, changePassword, logoutAll } = useAuth();
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  async function handleChangePassword(event) {
    event.preventDefault();
    if (saving) return;
    setFormError('');
    setSuccess('');

    const form = new FormData(event.currentTarget);
    const values = {
      currentPassword: String(form.get('currentPassword') || ''),
      newPassword: String(form.get('newPassword') || ''),
      confirmPassword: String(form.get('confirmPassword') || ''),
    };
    const fieldErrors = validateChangePassword(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    try {
      const message = await changePassword(values.currentPassword, values.newPassword);
      formRef.current?.reset();
      setSuccess(message || 'Password changed.');
    } catch (err) {
      // The API's message is safe to show (a wrong current password, a rate
      // limit or a validation message). Anything else gets a generic one.
      setFormError(err && err.status && err.status < 500 ? err.message : GENERIC_ERROR);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoutAll() {
    setSigningOut(true);
    setSignOutError('');
    try {
      await logoutAll(); // navigates to the login page
    } catch (err) {
      setSignOutError(err && err.status && err.status < 500 ? err.message : GENERIC_ERROR);
      setSigningOut(false);
    }
  }

  return (
    <section aria-labelledby="account-title">
      <div className="page-header">
        <h1 id="account-title">Account</h1>
        <p>Signed in as a {user ? user.role : 'user'}.</p>
      </div>

      <div className="account-grid">
        <section className="card" aria-labelledby="change-password-title">
          <h2 id="change-password-title">Change password</h2>
          <p className="field-hint">
            At least 8 characters with a number. Every other device you&apos;re signed in on is signed out.
          </p>

          <form ref={formRef} className="form" onSubmit={handleChangePassword} noValidate>
            <div aria-live="assertive">
              {formError && (
                <p className="alert error" role="alert">
                  {formError}
                </p>
              )}
            </div>
            <div aria-live="polite">
              {success && (
                <p className="alert success" role="status">
                  {success}
                </p>
              )}
            </div>

            <FormField
              id="currentPassword"
              name="currentPassword"
              type="password"
              label="Current password"
              autoComplete="current-password"
              error={errors.currentPassword}
            />
            <FormField
              id="newPassword"
              name="newPassword"
              type="password"
              label="New password"
              autoComplete="new-password"
              error={errors.newPassword}
            />
            <FormField
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm new password"
              autoComplete="new-password"
              error={errors.confirmPassword}
            />

            <div className="button-row">
              <button type="submit" className="button" disabled={saving}>
                {saving ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </form>
        </section>

        <section className="card" aria-labelledby="sessions-title">
          <h2 id="sessions-title">Signed-in devices</h2>
          <p>
            Lost a device, or logged in on a shared computer? This signs you out everywhere, including here, and you
            will need to log in again.
          </p>
          {confirming ? (
            <ConfirmAction
              title="Sign out of all devices?"
              confirmLabel="Yes, sign out everywhere"
              busyLabel="Signing out…"
              busy={signingOut}
              error={signOutError}
              onConfirm={handleLogoutAll}
              onCancel={() => {
                setConfirming(false);
                setSignOutError('');
              }}
            >
              <p>Every session of this account will end, including this one.</p>
            </ConfirmAction>
          ) : (
            <button type="button" className="button danger" onClick={() => setConfirming(true)}>
              Sign out of all devices
            </button>
          )}
        </section>
      </div>
    </section>
  );
}
