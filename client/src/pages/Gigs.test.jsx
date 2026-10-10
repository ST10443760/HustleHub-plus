import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { listGigs } from '../api/gigs';
import { deferred, renderWithProviders } from '../test/renderWithProviders';
import Gigs from './Gigs';

vi.mock('../api/gigs', async (importOriginal) => ({ ...(await importOriginal()), listGigs: vi.fn() }));

const client = { id: 'c1', name: 'Ann', role: 'client' };

function page(gigs, total = gigs.length) {
  return { gigs, page: 1, limit: 12, total };
}

const sampleGig = {
  id: 'd'.repeat(24),
  title: 'Logo design',
  price: 150,
  category: 'design',
  deliveryDays: 2,
  freelancer: { id: 'f1', name: 'Sipho' },
};

function renderGigs() {
  return renderWithProviders(<Gigs />, { user: client, route: '/gigs' });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Gigs page', () => {
  it('shows a loading state, then the list of gigs', async () => {
    const pending = deferred();
    listGigs.mockReturnValue(pending.promise);
    renderGigs();

    expect(screen.getByRole('status')).toHaveTextContent('Loading gigs');

    pending.resolve(page([sampleGig]));
    expect(await screen.findByRole('link', { name: 'Logo design' })).toBeInTheDocument();
    expect(screen.getByText('1 gig found')).toBeInTheDocument();
  });

  it('shows an empty state when there are no gigs', async () => {
    listGigs.mockResolvedValue(page([]));
    renderGigs();

    expect(await screen.findByRole('heading', { name: 'No gigs yet' })).toBeInTheDocument();
  });

  it('shows an error with a working retry button', async () => {
    const user = userEvent.setup();
    listGigs.mockRejectedValueOnce(new ApiError("Can't reach the server. Check your connection and try again.", 0));
    listGigs.mockResolvedValueOnce(page([sampleGig]));
    renderGigs();

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server");
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Logo design' })).toBeInTheDocument();
    expect(listGigs).toHaveBeenCalledTimes(2);
  });

  it('debounces the search: no request per keystroke, one after typing stops', async () => {
    listGigs.mockResolvedValue(page([sampleGig]));
    renderGigs();
    await screen.findByRole('link', { name: 'Logo design' });
    expect(listGigs).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    const search = screen.getByLabelText('Search');
    fireEvent.change(search, { target: { value: 'l' } });
    fireEvent.change(search, { target: { value: 'lo' } });
    fireEvent.change(search, { target: { value: 'logo' } });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(listGigs).toHaveBeenCalledTimes(1); // still typing - nothing sent yet

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    vi.useRealTimers();

    await waitFor(() => expect(listGigs).toHaveBeenCalledTimes(2));
    expect(listGigs.mock.calls[1][0]).toMatchObject({ q: 'logo', page: 1 });
  });

  it('sends the chosen category with the next request', async () => {
    const user = userEvent.setup();
    listGigs.mockResolvedValue(page([sampleGig]));
    renderGigs();
    await screen.findByRole('link', { name: 'Logo design' });

    await user.selectOptions(screen.getByLabelText('Category'), 'video');

    await waitFor(() => expect(listGigs).toHaveBeenCalledTimes(2));
    expect(listGigs.mock.calls[1][0]).toMatchObject({ category: 'video', page: 1 });
  });

  it('blocks an invalid price range before it reaches the api', async () => {
    const user = userEvent.setup();
    listGigs.mockResolvedValue(page([sampleGig]));
    renderGigs();
    await screen.findByRole('link', { name: 'Logo design' });

    await user.type(screen.getByLabelText('Min price (R)'), '500');
    await user.type(screen.getByLabelText('Max price (R)'), '10');

    expect(screen.getByText('Max price must be at least the min price')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(listGigs.mock.calls.every(([filters]) => filters.minPrice !== '500' || filters.maxPrice !== '10')).toBe(true);
  });
});
