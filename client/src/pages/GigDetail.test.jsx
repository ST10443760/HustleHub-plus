import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGig } from '../api/gigs';
import { renderWithProviders } from '../test/renderWithProviders';
import GigDetail from './GigDetail';

vi.mock('../api/gigs', async (importOriginal) => ({ ...(await importOriginal()), getGig: vi.fn() }));
vi.mock('../api/bookings', () => ({ createBooking: vi.fn() }));
vi.mock('../api/admin', () => ({ adminDeleteGig: vi.fn() }));

const GIG_ID = 'b'.repeat(24);
const gig = {
  id: GIG_ID,
  title: '&lt;img src=x onerror=alert(1)&gt;',
  description: 'Line one &amp; line two',
  price: 400,
  category: 'video',
  deliveryDays: 5,
  isActive: true,
  createdAt: '2026-10-01T10:00:00Z',
  freelancer: { id: 'owner-1', name: 'Sipho' },
};

function renderDetail(user) {
  return renderWithProviders(<GigDetail />, { user, route: `/gigs/${GIG_ID}`, path: '/gigs/:id' });
}

beforeEach(() => {
  getGig.mockResolvedValue({ gig });
});

describe('GigDetail', () => {
  it('renders an escaped malicious title as plain text, with no img element', async () => {
    const { container } = renderDetail({ id: 'c1', name: 'Ann', role: 'client' });

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('<img src=x onerror=alert(1)>');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Line one & line two')).toBeInTheDocument();
  });

  it('offers a client the Book button', async () => {
    renderDetail({ id: 'c1', name: 'Ann', role: 'client' });
    expect(await screen.findByRole('button', { name: 'Book this gig' })).toBeInTheDocument();
  });

  it('shows the owner an Edit link and no Book button', async () => {
    renderDetail({ id: 'owner-1', name: 'Sipho', role: 'freelancer' });

    expect(await screen.findByRole('link', { name: 'Edit this gig' })).toHaveAttribute(
      'href',
      `/freelancer/gigs/${GIG_ID}/edit`
    );
    expect(screen.queryByRole('button', { name: 'Book this gig' })).not.toBeInTheDocument();
  });

  it('shows an admin "Delete as admin" but never Book or Edit', async () => {
    renderDetail({ id: 'admin-1', name: 'Admin', role: 'admin' });

    expect(await screen.findByRole('button', { name: 'Delete as admin' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book this gig' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit this gig' })).not.toBeInTheDocument();
  });

  it('shows "not available" for a 404', async () => {
    const notFound = Object.assign(new Error('Gig not found'), { status: 404 });
    getGig.mockRejectedValueOnce(notFound);
    renderDetail({ id: 'c1', name: 'Ann', role: 'client' });

    expect(await screen.findByRole('heading', { name: 'Gig not available' })).toBeInTheDocument();
  });
});
