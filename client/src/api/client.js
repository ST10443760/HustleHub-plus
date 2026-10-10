import { clearToken, readToken } from '../utils/storage';

/**
 * Thin wrapper around fetch for the HustleHub+ API.
 *
 * - Only relative /api/... paths: in development the Vite proxy forwards
 *   them to the HTTPS API, so no host or port is ever hard-coded here.
 * - Adds the Bearer token when there is one.
 * - Unwraps { success, data } and throws an ApiError carrying the server's
 *   { error } message (or a generic one for network failures and non-JSON
 *   responses).
 * - A 401 on a request that carried a token means the session is no longer
 *   valid: the token is cleared and the registered handler sends the user
 *   to the login page.
 *
 * Nothing here logs tokens, request bodies or responses.
 */

export const NETWORK_ERROR = "Can't reach the server. Check your connection and try again.";
export const GENERIC_ERROR = 'Something went wrong. Please try again.';
const RATE_LIMIT_FALLBACK = 'Too many requests. Please wait a moment and try again.';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 means the request never got a response
  }
}

let unauthorizedHandler = null;

// AuthContext registers this so a dead session logs the user out cleanly.
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null; // empty or non-JSON body (e.g. the proxy's own error page)
  }
}

export async function apiRequest(path, { method = 'GET', body, signal, redirectOn401 = true } = {}) {
  if (typeof path !== 'string' || !path.startsWith('/api/')) {
    throw new Error('apiRequest only accepts relative /api/ paths');
  }

  const token = readToken();
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      credentials: 'same-origin',
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err; // the caller cancelled - not an error to show
    throw new ApiError(NETWORK_ERROR, 0);
  }

  const payload = await readJson(response);

  if (response.ok && payload && payload.success === true) {
    return payload.data;
  }

  const serverMessage = payload && typeof payload.error === 'string' ? payload.error : null;

  if (response.status === 401 && token && redirectOn401) {
    clearToken();
    if (unauthorizedHandler) unauthorizedHandler();
  }

  if (response.status === 429) {
    throw new ApiError(serverMessage || RATE_LIMIT_FALLBACK, 429);
  }

  if (!payload) {
    // No JSON at all: usually the API is down and the proxy answered.
    throw new ApiError(response.status >= 500 ? NETWORK_ERROR : GENERIC_ERROR, response.status);
  }

  throw new ApiError(serverMessage || GENERIC_ERROR, response.status);
}
