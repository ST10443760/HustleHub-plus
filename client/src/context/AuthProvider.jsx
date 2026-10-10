import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser, loginRequest, registerRequest } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { clearToken, readToken, saveToken } from '../utils/storage';
import { AuthContext } from './authContext';

// Only what the UI needs. The email isn't kept (it's only ever in the login
// and register forms) and the token stays in storage, never in state.
function toSessionUser(user) {
  return { id: user.id, name: user.name, role: user.role };
}

export default function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
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
        if (err.status === 401) clearToken(); // expired or invalid token
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
      setUser(null);
      navigate('/login', { replace: true, state: { expired: true } });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    saveToken(data.token);
    const sessionUser = toSessionUser(data.user);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const register = useCallback(async (details) => {
    const data = await registerRequest(details);
    saveToken(data.token);
    const sessionUser = toSessionUser(data.user);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
