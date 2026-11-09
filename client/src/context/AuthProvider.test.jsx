import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiError } from '../api/client';
import { fetchCurrentUser, loginRequest, logoutAllRequest } from '../api/auth';
import ProtectedRoute from '../components/ProtectedRoute';
import Account from '../pages/Account';
import Login from '../pages/Login';
import { saveToken } from '../utils/storage';
import AuthProvider from './AuthProvider';
import { LocationDisplay } from '../test/renderWithProviders';

// The real AuthProvider, ProtectedRoute, Login page and API client; only
// the auth requests and the network are faked.
vi.mock('../api/auth', () => ({
  fetchCurrentUser: vi.fn(),
  loginRequest: vi.fn(),
  registerRequest: vi.fn(),
  logoutAllRequest: vi.fn(),
  changePasswordRequest: vi.fn(),
}));

const SESSION_ENDED = 'Your session has ended. Please log in again.';
const SIGNED_OUT_EVERYWHERE = 'You have been signed out of all devices. Log in again to continue.';
const someone = { id: 'u1', name: 'Lerato', role: 'client' };

// The message, announced to assistive technology as a status.
async function findMessage(text) {
  const message = await screen.findByText(text);
  expect(message).toHaveAttribute('role', 'status');
  return message;
}

// A protected page that makes one API call when asked, like any page does.
function Bookings() {
  return (
    <button type="button" onClick={() => apiRequest('/api/bookings/mine').catch(() => {})}>
      Load bookings
    </button>
  );
}

function renderApp(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <nav>
          <Link to="/register">To register</Link>
          <Link to="/login">To login</Link>
        </nav>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<p>Register page</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/account" element={<Account />} />
          </Route>
          <Route path="*" element={<p>Somewhere else</p>} />
        </Routes>
        <LocationDisplay />
      </AuthProvider>
    </MemoryRouter>
  );
}

function respond401() {
  return Promise.resolve(
    new Response(JSON.stringify({ success: false, error: 'Not authenticated - invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

describe('messages on the login page after a session ends', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('a session that ends on a later request lands on Log in with "Your session has ended"', async () => {
    saveToken('valid.token.before');
    fetchCurrentUser.mockResolvedValue({ user: someone });
    fetch.mockImplementation(respond401);
    const user = userEvent.setup();
    renderApp('/bookings');

    await user.click(await screen.findByRole('button', { name: 'Load bookings' }));

    await findMessage(SESSION_ENDED);
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('a stored token refused on start-up (for example after a reload) also shows the message', async () => {
    saveToken('revoked.token');
    fetchCurrentUser.mockRejectedValue(new ApiError('Not authenticated - invalid or expired token', 401));
    renderApp('/bookings');

    await findMessage(SESSION_ENDED);
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('"Sign out of all devices" lands on Log in with "You have been signed out of all devices"', async () => {
    saveToken('valid.token');
    fetchCurrentUser.mockResolvedValue({ user: someone });
    logoutAllRequest.mockResolvedValue({ message: 'You have been signed out of all devices.' });
    const user = userEvent.setup();
    renderApp('/account');

    await user.click(await screen.findByRole('button', { name: 'Sign out of all devices' }));
    await user.click(screen.getByRole('button', { name: 'Yes, sign out everywhere' }));

    await findMessage(SIGNED_OUT_EVERYWHERE);
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('shows the message once: it is gone after visiting another page and coming back', async () => {
    saveToken('valid.token.before');
    fetchCurrentUser.mockResolvedValue({ user: someone });
    fetch.mockImplementation(respond401);
    const user = userEvent.setup();
    renderApp('/bookings');
    await user.click(await screen.findByRole('button', { name: 'Load bookings' }));
    await findMessage(SESSION_ENDED);

    await user.click(screen.getByRole('link', { name: 'To register' }));
    expect(screen.getByText('Register page')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'To login' }));

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByText(SESSION_ENDED)).not.toBeInTheDocument();
  });

  it('a plain visit to a protected page shows no message, and logging in returns there', async () => {
    loginRequest.mockResolvedValue({ user: someone, token: 'new.token' });
    const user = userEvent.setup();
    renderApp('/bookings');

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'lerato@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('button', { name: 'Load bookings' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/bookings');
  });

  it('renders the message as plain text', async () => {
    saveToken('revoked.token');
    fetchCurrentUser.mockRejectedValue(new ApiError('Not authenticated - invalid or expired token', 401));
    const { container } = renderApp('/bookings');

    const status = await findMessage(SESSION_ENDED);
    expect(status.children).toHaveLength(0);
    expect(container.querySelector('[dangerouslysetinnerhtml]')).toBeNull();
  });
});
