import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { renderWithProviders } from '../test/renderWithProviders';
import Register from './Register';

describe('Register page', () => {
  it('shows inline errors for bad input and does not submit', async () => {
    const user = userEvent.setup();
    const { auth } = renderWithProviders(<Register />, { route: '/register' });

    await user.type(screen.getByLabelText('Name'), 'A');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Name must be 2-60 characters')).toBeInTheDocument();
    expect(screen.getByText('Must be a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must contain at least one number')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('only offers the client and freelancer roles, never admin', () => {
    renderWithProviders(<Register />, { route: '/register' });

    const group = screen.getByRole('group', { name: /I am a/ });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.value)).toEqual(['client', 'freelancer']);
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
  });

  it('submits trimmed, valid data to register', async () => {
    const user = userEvent.setup();
    const { auth } = renderWithProviders(<Register />, { route: '/register' });
    auth.register.mockResolvedValue({ id: '1', name: 'Thandi', role: 'freelancer' });

    await user.type(screen.getByLabelText('Name'), '  Thandi Mokoena ');
    await user.type(screen.getByLabelText('Email'), ' thandi@example.com ');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByLabelText(/Freelancer/));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(auth.register).toHaveBeenCalledWith({
      name: 'Thandi Mokoena',
      email: 'thandi@example.com',
      password: 'secret123',
      role: 'freelancer',
    });
  });

  it("shows the server's message when it rejects the registration", async () => {
    const user = userEvent.setup();
    const { auth } = renderWithProviders(<Register />, { route: '/register' });
    auth.register.mockRejectedValue(new ApiError('An account with this email already exists', 409));

    await user.type(screen.getByLabelText('Name'), 'Thandi');
    await user.type(screen.getByLabelText('Email'), 'thandi@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists');
  });
});
