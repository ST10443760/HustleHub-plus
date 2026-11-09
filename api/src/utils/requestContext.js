const { AsyncLocalStorage } = require('node:async_hooks');

/**
 * Per-request context for the logger. The request-id middleware starts a
 * context for every request; anything logged while that request is being
 * handled (in a controller, a middleware, a model hook) picks up its
 * request id, method, path, ip and, once `protect` has run, the user id and
 * role, without every call site passing them in.
 */
const storage = new AsyncLocalStorage();

/** The current request's context, or undefined outside a request. */
function getContext() {
  return storage.getStore();
}

/** Runs `fn` inside `context`. */
function runWithContext(context, fn) {
  return storage.run(context, fn);
}

/** Records the authenticated user on the current request's context. */
function setContextUser(user) {
  const context = storage.getStore();
  if (context && user) {
    context.userId = user.id;
    context.role = user.role;
  }
}

/**
 * The matched route pattern, e.g. "/api/gigs/:id", so denials can be
 * grouped by route instead of by every id. Falls back to the path (never
 * the query string) when no route has matched yet.
 */
function routeOf(req) {
  const base = typeof req.baseUrl === 'string' ? req.baseUrl : '';
  const tail = req.route && typeof req.route.path === 'string' ? req.route.path : req.path || '';
  const route = `${base}${tail}`;
  // A router's own "/" route reads as "/api/income/"; drop that slash.
  return route.length > 1 && route.endsWith('/') ? route.slice(0, -1) : route;
}

module.exports = { getContext, runWithContext, setContextUser, routeOf };
