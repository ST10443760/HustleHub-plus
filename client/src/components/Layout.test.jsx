import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import Layout from './Layout';

const nav = () => within(screen.getByRole('navigation', { name: 'Main' }));

describe('Layout navigation', () => {
  for (const role of ['client', 'freelancer', 'admin']) {
    it(`shows the Account page to a ${role}`, () => {
      renderWithProviders(<Layout />, { user: { id: 'u1', name: 'Test', role } });
      expect(nav().getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');
    });
  }

  it('shows the Audit log only to admins', () => {
    renderWithProviders(<Layout />, { user: { id: 'a1', name: 'Admin', role: 'admin' } });
    expect(nav().getByRole('link', { name: 'Audit log' })).toHaveAttribute('href', '/admin/audit-log');
  });

  it('does not show the Audit log to other roles', () => {
    renderWithProviders(<Layout />, { user: { id: 'u1', name: 'Test', role: 'client' } });
    expect(nav().queryByRole('link', { name: 'Audit log' })).not.toBeInTheDocument();
  });
});
