import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { createBooking } from '../api/bookings';
import { deferred, renderWithProviders } from '../test/renderWithProviders';
import BookingPanel from './BookingPanel';

vi.mock('../api/bookings', () => ({ createBooking: vi.fn() }));

const GIG_ID = 'c'.repeat(24);

function renderPanel(onUnavailable = vi.fn()) {
  renderWithProviders(
    <BookingPanel gigId={GIG_ID} title="Logo design" price={350} onUnavailable={onUnavailable} />
  );
  return { onUnavailable };
}

describe('BookingPanel', () => {
  it('shows a confirmation with the price and the simulated payment notice, and Cancel closes it', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Book this gig' }));

    expect(screen.getByRole('heading', { name: 'Confirm your booking' })).toBeInTheDocument();
    expect(screen.getByText('Logo design')).toBeInTheDocument();
    expect(screen.getByText(/R\s350,00/)).toBeInTheDocument();
    expect(screen.getByText(/Payment is simulated/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Confirm your booking' })).not.toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('books only once on a double click, sending only the gig id', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    createBooking.mockReturnValue(pending.promise);
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Book this gig' }));
    await user.dblClick(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(createBooking).toHaveBeenCalledTimes(1);
    expect(createBooking).toHaveBeenCalledWith(GIG_ID);
    expect(screen.getByRole('button', { name: 'Booking…' })).toBeDisabled();

    pending.resolve({ transaction: { reference: 'TXN-20261010-ABCDEF123456' } });
    expect(await screen.findByText('TXN-20261010-ABCDEF123456')).toBeInTheDocument();
  });

  it('shows the transaction reference and a link to my bookings on success', async () => {
    const user = userEvent.setup();
    createBooking.mockResolvedValue({ transaction: { reference: 'TXN-20261010-0011223344AA' } });
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Book this gig' }));
    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByRole('heading', { name: 'Booking confirmed' })).toBeInTheDocument();
    expect(screen.getByText('TXN-20261010-0011223344AA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View my bookings' })).toHaveAttribute('href', '/bookings');
  });

  it('shows the retry message on a 429 and lets the user try again', async () => {
    const user = userEvent.setup();
    createBooking.mockRejectedValue(new ApiError('Too many requests, please try again in 120 seconds.', 429));
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Book this gig' }));
    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests, please try again in 120 seconds.');
    expect(screen.getByRole('button', { name: 'Confirm booking' })).toBeEnabled();
  });

  it('reports the gig as unavailable on a 404', async () => {
    const user = userEvent.setup();
    createBooking.mockRejectedValue(new ApiError('Gig not found', 404));
    const { onUnavailable } = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Book this gig' }));
    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    await vi.waitFor(() => expect(onUnavailable).toHaveBeenCalledTimes(1));
  });
});
