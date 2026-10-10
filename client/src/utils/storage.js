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

let memoryToken = null; // fallback ONLY when localStorage can't be used

// When storage works it is the single source of truth - so a logout in
// another tab (which clears it) logs this tab out too, instead of an
// in-memory copy quietly keeping the old session alive.
export function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return memoryToken;
  }
}

export function saveToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    memoryToken = null;
  } catch {
    // Storage blocked - the in-memory copy keeps this tab logged in.
    memoryToken = token;
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
