import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { renderWithProviders } from '../test/renderWithProviders';
import Login from './Login';

async function fillAndSubmit(user, email = 'ann@example.com', password = 'password123') {
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('Login page', () => {
  it('shows the generic error after a failed attempt', async () => {
    const user = userEvent.setup();
    const { auth } = renderWithProviders(<Login />, { route: '/login' });
    auth.login.mockRejectedValue(new ApiError('Invalid email or password', 401));

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('shows the same generic error even if the server says something more specific', async () => {
    const user = userEvent.setup();
    const { auth } = renderWithProviders(<Login />, { route: '/login' });
    auth.login.mockRejectedValue(new ApiError('Must be a valid email address', 400));

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('shows the retry message on a 429', async () => {
    const user = userEvent.setup();
    const { auth } = renderWithProviders(<Login />, { route: '/login' });
    auth.login.mockRejectedValue(new ApiError('Too many requests, please try again in 600 seconds.', 429));

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests, please try again in 600 seconds.');
  });

  it('calls login with the trimmed email and goes to the gigs page', async () => {
    const user = userEvent.setup();
    const { auth } = renderWithProviders(<Login />, { route: '/login', path: '/login' });
    auth.login.mockResolvedValue({ id: '1', name: 'Ann', role: 'client' });

    await fillAndSubmit(user, '  ann@example.com ', 'password123');

    expect(auth.login).toHaveBeenCalledWith('ann@example.com', 'password123');
    expect(await screen.findByTestId('location')).toHaveTextContent('/gigs');
  });
});
