import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { renderWithProviders } from '../test/renderWithProviders';
import GigForm from './GigForm';

async function fill(user, { title, description, price, days, category }) {
  if (title !== undefined) await user.type(screen.getByLabelText('Title'), title);
  if (description !== undefined) await user.type(screen.getByLabelText('Description'), description);
  if (price !== undefined) await user.type(screen.getByLabelText('Price (R)'), price);
  if (days !== undefined) await user.type(screen.getByLabelText('Delivery days'), days);
  if (category !== undefined) await user.selectOptions(screen.getByLabelText('Category'), category);
}

describe('GigForm', () => {
  it('blocks a bad price and bad delivery days without calling the api', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<GigForm submitLabel="Create gig" busyLabel="Creating…" onSubmit={onSubmit} />);

    await fill(user, {
      title: 'Logo design',
      description: 'A clean, modern logo for your brand',
      price: '12.345',
      days: '2.5',
      category: 'design',
    });
    await user.click(screen.getByRole('button', { name: 'Create gig' }));

    expect(screen.getByText('Enter a price like 150 or 149.99')).toBeInTheDocument();
    expect(screen.getByText('Delivery days must be a whole number from 1 to 90')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends price and delivery days as real numbers', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<GigForm submitLabel="Create gig" busyLabel="Creating…" onSubmit={onSubmit} />);

    await fill(user, {
      title: '  Logo design ',
      description: 'A clean, modern logo for your brand',
      price: '150.5',
      days: '7',
      category: 'design',
    });
    await user.click(screen.getByRole('button', { name: 'Create gig' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Logo design',
      description: 'A clean, modern logo for your brand',
      price: 150.5,
      category: 'design',
      deliveryDays: 7,
    });
    const sent = onSubmit.mock.calls[0][0];
    expect(typeof sent.price).toBe('number');
    expect(typeof sent.deliveryDays).toBe('number');
  });

  it('shows a clear message when the api says the gig is not yours', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new ApiError('You do not have permission to perform this action', 403));
    renderWithProviders(
      <GigForm
        initialValues={{ title: 'Logo design', description: 'A clean, modern logo', price: '150', category: 'design', deliveryDays: '3' }}
        submitLabel="Save changes"
        busyLabel="Saving…"
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You can only change your own gigs.');
  });
});
