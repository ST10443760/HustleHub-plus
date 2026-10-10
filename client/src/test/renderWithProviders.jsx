import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../context/authContext';

// Shows the current path so tests can assert on redirects.
export function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

/**
 * Renders `ui` inside a memory router and a fake auth context.
 *   user  - the signed-in user ({ id, name, role }) or null
 *   route - the starting URL
 *   path  - a route pattern for `ui` (e.g. '/gigs/:id'); any other path
 *           renders <LocationDisplay /> so redirects can be checked
 */
export function renderWithProviders(ui, { user = null, loading = false, route = '/', path, auth = {} } = {}) {
  const value = {
    user,
    loading,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...auth,
  };

  const content = path ? (
    <Routes>
      <Route path={path} element={ui} />
      <Route path="*" element={<LocationDisplay />} />
    </Routes>
  ) : (
    ui
  );

  const utils = render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[route]}>{content}</MemoryRouter>
    </AuthContext.Provider>
  );
  return { ...utils, auth: value };
}

// A promise you resolve or reject from the test (for "in flight" states).
export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
