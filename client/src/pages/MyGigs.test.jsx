import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteGig, listMyGigs, setGigActive } from '../api/gigs';
import { renderWithProviders } from '../test/renderWithProviders';
import MyGigs from './MyGigs';

vi.mock('../api/gigs', async (importOriginal) => ({
  ...(await importOriginal()),
  listMyGigs: vi.fn(),
  deleteGig: vi.fn(),
  setGigActive: vi.fn(),
}));

const freelancer = { id: 'f1', name: 'Sipho', role: 'freelancer' };
const gigs = [
  { id: '1'.repeat(24), title: 'Logo design', price: 150, category: 'design', deliveryDays: 3, isActive: true },
  { id: '2'.repeat(24), title: 'Promo video', price: 900, category: 'video', deliveryDays: 10, isActive: false },
];

function renderMyGigs() {
  return renderWithProviders(<MyGigs />, { user: freelancer, route: '/freelancer/gigs' });
}

async function deleteFirstGig(user) {
  const row = (await screen.findByRole('link', { name: 'Logo design' })).closest('tr');
  await user.click(within(row).getByRole('button', { name: /Delete/ }));
}

beforeEach(() => {
  listMyGigs.mockResolvedValue({ gigs });
});

describe('My gigs', () => {
  it('lists gigs with active and inactive badges', async () => {
    renderMyGigs();

    expect(await screen.findByRole('link', { name: 'Logo design' })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New gig' })).toHaveAttribute('href', '/freelancer/gigs/new');
  });

  it('asks for confirmation before deleting, and Cancel deletes nothing', async () => {
    const user = userEvent.setup();
    renderMyGigs();

    await deleteFirstGig(user);
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this gig?' });
    expect(within(dialog).getByText('Logo design')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(deleteGig).not.toHaveBeenCalled();
  });

  it("shows the server's message when the gig was deleted", async () => {
    const user = userEvent.setup();
    deleteGig.mockResolvedValue({ id: gigs[0].id, deleted: true, deactivated: false, message: 'The gig was deleted.' });
    renderMyGigs();

    await deleteFirstGig(user);
    await user.click(screen.getByRole('button', { name: 'Delete gig' }));

    expect(await screen.findByText('The gig was deleted.')).toBeInTheDocument();
    expect(deleteGig).toHaveBeenCalledWith(gigs[0].id);
  });

  it("shows the server's message when the gig was deactivated instead", async () => {
    const user = userEvent.setup();
    const message = 'This gig has bookings, so it was deactivated instead of deleted to keep the booking history.';
    deleteGig.mockResolvedValue({ id: gigs[0].id, deleted: false, deactivated: true, message });
    renderMyGigs();

    await deleteFirstGig(user);
    await user.click(screen.getByRole('button', { name: 'Delete gig' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText('The gig was deleted.')).not.toBeInTheDocument();
  });

  it('deactivates an active gig with { isActive: false }', async () => {
    const user = userEvent.setup();
    setGigActive.mockResolvedValue({ gig: { ...gigs[0], isActive: false } });
    renderMyGigs();

    const row = (await screen.findByRole('link', { name: 'Logo design' })).closest('tr');
    await user.click(within(row).getByRole('button', { name: /Deactivate/ }));

    expect(setGigActive).toHaveBeenCalledWith(gigs[0].id, false);
    expect(await screen.findByText('"Logo design" is now inactive.')).toBeInTheDocument();
  });
});
