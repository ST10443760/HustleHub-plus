import { apiRequest } from './client';

// Login and register never trigger the "session expired" redirect: a 401
// there just means wrong credentials.
export function loginRequest(email, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    redirectOn401: false,
  });
}

export function registerRequest({ name, email, password, role }) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: { name, email, password, role },
    redirectOn401: false,
  });
}

// Used on start-up to check a stored token. A 401 here just means the
// token is stale, so it's cleared quietly instead of redirecting.
export function fetchCurrentUser(signal) {
  return apiRequest('/api/auth/me', { signal, redirectOn401: false });
}

// Any logged-in user. A wrong current password comes back as a 400 (not a
// 401), so it shows as a form error and never logs the user out. A 401 here
// really means the session is gone, so the normal redirect applies.
export function changePasswordRequest(currentPassword, newPassword) {
  return apiRequest('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

// Ends every session of this account, including this one.
export function logoutAllRequest() {
  return apiRequest('/api/auth/logout-all', { method: 'POST' });
}
