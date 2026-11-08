import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listAuditLogs } from '../api/admin';
import { ApiError } from '../api/client';
import { renderWithProviders } from '../test/renderWithProviders';
import AdminAuditLog from './AdminAuditLog';

vi.mock('../api/admin', async (importOriginal) => ({ ...(await importOriginal()), listAuditLogs: vi.fn() }));

const admin = { id: 'a1', name: 'Admin', role: 'admin' };

const entries = [
  {
    id: 'l1',
    action: 'account_locked',
    actor: { id: 'u1', name: 'Tom &amp; Jerry' },
    actorRole: 'client',
    targetType: 'user',
    targetId: '6aee7111de401ed6299616b7',
    outcome: 'success',
    ip: '203.0.113.7',
    meta: { failedAttempts: 5, lockMinutes: 15 },
    createdAt: '2026-11-08T10:00:00Z',
  },
  {
    id: 'l2',
    action: 'admin_gig_deleted',
    actor: null,
    actorRole: 'admin',
    targetType: 'gig',
    targetId: '6aee7111de401ed6299616b8',
    outcome: 'success',
    createdAt: '2026-11-08T09:00:00Z',
  },
];

describe('Admin audit log page', () => {
  beforeEach(() => {
    listAuditLogs.mockResolvedValue({ logs: entries, page: 1, limit: 20, total: 2 });
  });

  it('shows each entry with a readable action, actor, target and details', async () => {
    renderWithProviders(<AdminAuditLog />, { user: admin });

    const table = await screen.findByRole('table', { name: 'Audit log, newest first' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2

    expect(within(rows[1]).getByText('Account locked')).toBeInTheDocument();
    expect(within(rows[1]).getByText('5 failed attempts, locked 15 min')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Tom & Jerry')).toBeInTheDocument();
    expect(within(rows[1]).getByText('203.0.113.7')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Admin deleted a gig')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Deleted user')).toBeInTheDocument();
    expect(screen.getByText('2 entries')).toBeInTheDocument();
    expect(listAuditLogs).toHaveBeenCalledWith({ page: 1, limit: 20, action: '' }, expect.anything());
  });

  it('filters by action', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminAuditLog />, { user: admin });
    await screen.findByRole('table');

    await user.selectOptions(screen.getByLabelText('Action'), 'password_changed');
    expect(listAuditLogs).toHaveBeenLastCalledWith({ page: 1, limit: 20, action: 'password_changed' }, expect.anything());
  });

  it('ignores an unknown action in the URL', async () => {
    renderWithProviders(<AdminAuditLog />, { user: admin, route: '/admin/audit-log?action=drop_database', path: '/admin/audit-log' });
    await screen.findByRole('table');
    expect(listAuditLogs).toHaveBeenCalledWith({ page: 1, limit: 20, action: '' }, expect.anything());
  });

  it('shows an empty state', async () => {
    listAuditLogs.mockResolvedValue({ logs: [], page: 1, limit: 20, total: 0 });
    renderWithProviders(<AdminAuditLog />, { user: admin });
    expect(await screen.findByRole('heading', { name: 'No audit entries yet' })).toBeInTheDocument();
  });

  it('shows the error from the API', async () => {
    listAuditLogs.mockRejectedValue(new ApiError('You do not have permission to perform this action', 403));
    renderWithProviders(<AdminAuditLog />, { user: admin });
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission');
  });
});
