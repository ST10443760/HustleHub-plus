/**
 * The JWT is kept in localStorage under one key. That's an accepted
 * trade-off for this project (see "JWT in localStorage" in the main README):
 * any script on the page could read it, which is why the app never renders
 * HTML from API data and the CSP blocks inline scripts.
 *
 * Every access is wrapped in try/catch: storage can be blocked (private
 * mode, strict browser settings) and the app should still work, just
 * without staying logged in across reloads.
 */
const TOKEN_KEY = 'hustlehub.token';

let memoryToken = null; // fallback when localStorage is unavailable

export function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || memoryToken;
  } catch {
    return memoryToken;
  }
}

export function saveToken(token) {
  memoryToken = token;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked - the in-memory copy keeps this tab logged in.
  }
}

export function clearToken() {
  memoryToken = null;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}
