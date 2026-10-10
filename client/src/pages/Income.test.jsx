import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getIncome } from '../api/income';
import { renderWithProviders } from '../test/renderWithProviders';
import Income from './Income';

vi.mock('../api/income', () => ({ getIncome: vi.fn() }));

const freelancer = { id: 'f1', name: 'Sipho', role: 'freelancer' };

describe('Income page', () => {
  it('shows the total, the booking count and each item', async () => {
    getIncome.mockResolvedValue({
      totalEarned: 1049.98,
      bookingCount: 2,
      items: [
        { bookingId: 'b1', gigTitle: 'Logo &amp; branding', amount: 899.99, date: '2026-10-09T09:00:00Z', reference: 'TXN-20261009-AAAAAAAAAAAA' },
        { bookingId: 'b2', gigTitle: 'Blog post', amount: 149.99, date: '2026-10-08T09:00:00Z', reference: 'TXN-20261008-BBBBBBBBBBBB' },
      ],
    });
    renderWithProviders(<Income />, { user: freelancer });

    expect(await screen.findByText(/R\s1\s049,98/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Logo & branding')).toBeInTheDocument();
    expect(screen.getByText('TXN-20261009-AAAAAAAAAAAA')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 items
  });

  it('shows a friendly empty state with a zero total', async () => {
    getIncome.mockResolvedValue({ totalEarned: 0, bookingCount: 0, items: [] });
    renderWithProviders(<Income />, { user: freelancer });

    expect(await screen.findByRole('heading', { name: 'No income yet' })).toBeInTheDocument();
    expect(screen.getByText(/R\s0,00/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
