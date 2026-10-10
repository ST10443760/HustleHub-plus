import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../context/authContext';
import ProtectedRoute from './ProtectedRoute';

function renderAt(user, { loading = false } = {}) {
  const auth = { user, loading, login: vi.fn(), register: vi.fn(), logout: vi.fn() };
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/income']}>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route
            path="/income"
            element={
              <ProtectedRoute roles={['freelancer']}>
                <p>Income content</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute', () => {
  it('sends a logged-out visitor to the login page', () => {
    renderAt(null);
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Income content')).not.toBeInTheDocument();
  });

  it('shows "not allowed" to a logged-in user with the wrong role', () => {
    renderAt({ id: '1', name: 'Ann', role: 'client' });
    expect(screen.getByRole('heading', { name: 'Not allowed' })).toBeInTheDocument();
    expect(screen.queryByText('Income content')).not.toBeInTheDocument();
  });

  it('shows the content to the right role', () => {
    renderAt({ id: '2', name: 'Sipho', role: 'freelancer' });
    expect(screen.getByText('Income content')).toBeInTheDocument();
  });

  it('waits while the session is being checked', () => {
    renderAt(null, { loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
