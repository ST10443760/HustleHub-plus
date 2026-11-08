import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { renderWithProviders } from '../test/renderWithProviders';
import Account from './Account';

const user = { id: 'u1', name: 'Sipho', role: 'freelancer' };

function setup(auth = {}) {
  const actions = {
    changePassword: vi.fn().mockResolvedValue('Password changed. You have been signed out everywhere else.'),
    logoutAll: vi.fn().mockResolvedValue(undefined),
    ...auth,
  };
  const utils = renderWithProviders(<Account />, { user, auth: actions });
  return { ...utils, user: userEvent.setup(), actions };
}

async function fillPasswords(u, { current = 'OldPassword1', next = 'NewPassword2', confirm = next } = {}) {
  if (current) await u.type(screen.getByLabelText('Current password'), current);
  if (next) await u.type(screen.getByLabelText('New password'), next);
  if (confirm) await u.type(screen.getByLabelText('Confirm new password'), confirm);
}

describe('Account page - change password', () => {
  it('uses the right autocomplete hints and password inputs', () => {
    setup();
    expect(screen.getByLabelText('Current password')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute('type', 'password');
  });

  it('shows inline errors and sends nothing when the form is invalid', async () => {
    const { user: u, actions } = setup();
    await u.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByText('Current password is required')).toBeInTheDocument();
    expect(screen.getByText('New password is required')).toBeInTheDocument();

    await fillPasswords(u, { next: 'short', confirm: 'other' });
    await u.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByText('New password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('The passwords do not match')).toBeInTheDocument();
    expect(actions.changePassword).not.toHaveBeenCalled();
  });

  it('changes the password, shows success and clears the fields', async () => {
    const { user: u, actions } = setup();
    await fillPasswords(u);
    await u.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Password changed. You have been signed out everywhere else.')).toBeInTheDocument();
    expect(actions.changePassword).toHaveBeenCalledWith('OldPassword1', 'NewPassword2');
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    expect(screen.getByLabelText('New password')).toHaveValue('');
  });

  it('shows the API message for a wrong current password and does not log out', async () => {
    const message = 'Current password is incorrect, or there have been too many attempts. Try again later.';
    const { user: u, auth } = setup({ changePassword: vi.fn().mockRejectedValue(new ApiError(message, 400)) });
    await fillPasswords(u);
    await u.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(auth.logout).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Change password' })).toBeEnabled();
  });

  it('shows a generic message for a server error', async () => {
    const { user: u } = setup({ changePassword: vi.fn().mockRejectedValue(new ApiError('internal details', 500)) });
    await fillPasswords(u);
    await u.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    expect(screen.queryByText('internal details')).not.toBeInTheDocument();
  });
});

describe('Account page - sign out of all devices', () => {
  it('asks for confirmation first, and cancel does nothing', async () => {
    const { user: u, actions } = setup();
    await u.click(screen.getByRole('button', { name: 'Sign out of all devices' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Sign out of all devices?' });
    expect(actions.logoutAll).not.toHaveBeenCalled();

    await u.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(actions.logoutAll).not.toHaveBeenCalled();
  });

  it('signs out everywhere after confirming', async () => {
    const { user: u, actions } = setup();
    await u.click(screen.getByRole('button', { name: 'Sign out of all devices' }));
    await u.click(screen.getByRole('button', { name: 'Yes, sign out everywhere' }));
    expect(actions.logoutAll).toHaveBeenCalledTimes(1);
  });

  it('shows an error if signing out fails', async () => {
    const { user: u } = setup({ logoutAll: vi.fn().mockRejectedValue(new ApiError('Too many requests, please try again in 60 seconds.', 429)) });
    await u.click(screen.getByRole('button', { name: 'Sign out of all devices' }));
    await u.click(screen.getByRole('button', { name: 'Yes, sign out everywhere' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests');
  });
});
