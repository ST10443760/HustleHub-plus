import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePasswordRequest, fetchCurrentUser, loginRequest, logoutAllRequest, registerRequest } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { clearToken, readToken, saveToken } from '../utils/storage';
import { AuthContext } from './authContext';

// Only what the UI needs. The email isn't kept (it's only ever in the login
// and register forms) and the token stays in storage, never in state.
function toSessionUser(user) {
  return { id: user.id, name: user.name, role: user.role };
}

// Why the user is being sent to the login page, when a session ends:
// 'expired' (the API refused the token) or 'signedOutEverywhere'. Held here
// rather than in the navigation state, because ProtectedRoute redirects at
// the same moment with its own state and would replace it. It lives in
// memory only and the login page clears it as soon as it reads it, so it
// is shown once and never on a later visit.
export default function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState(null);
  // Only "loading" if there's a stored token to check.
  const [loading, setLoading] = useState(() => Boolean(readToken()));

  // On start-up, check the stored token with the API and load the user.
  useEffect(() => {
    if (!readToken()) return undefined;

    const controller = new AbortController();
    fetchCurrentUser(controller.signal)
      .then((data) => setUser(toSessionUser(data.user)))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (err.status === 401) {
          // The stored token was refused (expired, or revoked by a password
          // change or "sign out of all devices" elsewhere).
          clearToken();
          setNotice('expired');
        }
        setUser(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  // Any later 401 on a protected call: the session is gone, so log out and
  // go to the login page (api/client.js has already cleared the token).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setNotice('expired');
      setUser(null);
      navigate('/login', { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    saveToken(data.token);
    setNotice(null);
    const sessionUser = toSessionUser(data.user);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const register = useCallback(async (details) => {
    const data = await registerRequest(details);
    saveToken(data.token);
    setNotice(null);
    const sessionUser = toSessionUser(data.user);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setNotice(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Every other session ends; this one continues with the fresh token the
  // API returns (the old one is no longer valid).
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const data = await changePasswordRequest(currentPassword, newPassword);
    saveToken(data.token);
    setUser(toSessionUser(data.user));
    return data.message;
  }, []);

  // Ends every session, this one included, then back to the login page.
  const logoutAll = useCallback(async () => {
    await logoutAllRequest();
    clearToken();
    setNotice('signedOutEverywhere');
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Called by the login page once it has shown the notice.
  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo(
    () => ({ user, loading, notice, clearNotice, login, register, logout, changePassword, logoutAll }),
    [user, loading, notice, clearNotice, login, register, logout, changePassword, logoutAll]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
