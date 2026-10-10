import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { listUsers } from '../api/admin';
import { renderWithProviders } from '../test/renderWithProviders';
import AdminUsers from './AdminUsers';

vi.mock('../api/admin', () => ({ listUsers: vi.fn() }));

const admin = { id: 'a1', name: 'Admin', role: 'admin' };

describe('Admin users page', () => {
  it('renders a row per user and never renders a password field', async () => {
    listUsers.mockResolvedValue({
      users: [
        { id: 'u1', name: 'Ann O&#x27;Neil', email: 'ann@example.com', role: 'client', createdAt: '2026-10-01T08:00:00Z' },
        { id: 'u2', name: 'Sipho', email: 'sipho@example.com', role: 'freelancer', createdAt: '2026-09-30T08:00:00Z' },
      ],
    });
    const { container } = renderWithProviders(<AdminUsers />, { user: admin });

    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 users
    expect(within(rows[1]).getByText("Ann O'Neil")).toBeInTheDocument();
    expect(within(rows[1]).getByText('ann@example.com')).toBeInTheDocument();
    expect(within(rows[2]).getByText('freelancer')).toBeInTheDocument();

    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it('shows the error from the api', async () => {
    listUsers.mockRejectedValue(Object.assign(new Error('You do not have permission to perform this action'), { status: 403 }));
    renderWithProviders(<AdminUsers />, { user: admin });

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission');
  });
});
