import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getIncome, getTaxEstimate } from '../api/income';
import { ApiError } from '../api/client';
import { renderWithProviders } from '../test/renderWithProviders';
import { emptyTotals, makeTaxEstimate } from '../test/taxEstimateFixture';
import Income from './Income';

vi.mock('../api/income', () => ({ getIncome: vi.fn(), getTaxEstimate: vi.fn() }));

const freelancer = { id: 'f1', name: 'Sipho', role: 'freelancer' };
const noBookings = { totalEarned: 0, bookingCount: 0, items: [] };

// Stat cards are "label, value, hint" - find the value next to a label.
function statValue(label) {
  const card = screen.getByText(label, { selector: '.stat-label' }).closest('.stat');
  return card.querySelector('.stat-value').textContent;
}

describe('Income dashboard', () => {
  beforeEach(() => {
    getIncome.mockResolvedValue(noBookings);
  });

  it('shows the summary cards, breakdown and assumptions from the API', async () => {
    getTaxEstimate.mockResolvedValue(makeTaxEstimate());
    renderWithProviders(<Income />, { user: freelancer });

    expect(await screen.findByText(/Showing 1 March 2026 to 28 February 2027/)).toBeInTheDocument();
    expect(getTaxEstimate).toHaveBeenCalledWith(null, expect.anything());

    expect(statValue('Total earned')).toMatch(/R\s300\s000,00/);
    expect(statValue('Estimated tax')).toMatch(/R\s40\s572,00/);
    expect(statValue('Take-home')).toMatch(/R\s259\s428,00/);
    expect(statValue('Effective tax rate')).toBe('13,52%');
    expect(screen.getByText('8 bookings this tax year')).toBeInTheDocument();

    const breakdown = screen.getByRole('table', { name: 'Estimated tax by bracket' });
    const firstBracket = within(breakdown).getByText(/R\s0 to R\s245\s100/).closest('tr');
    expect(within(firstBracket).getByText('18%')).toBeInTheDocument();
    expect(within(firstBracket).getAllByText(/R\s245\s100,00|R\s44\s118,00/)).toHaveLength(2);
    expect(within(breakdown).getByText(/Above R\s1\s878\s600/)).toBeInTheDocument();
    expect(within(breakdown).getByText(/-R\s17\s820,00/)).toBeInTheDocument();

    const panel = screen.getByRole('complementary', { name: 'How this estimate works' });
    expect(within(panel).getByText(/Resident individual under 65/)).toBeInTheDocument();
    expect(within(panel).getByText(/not tax advice/)).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /SARS/ })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('refetches when a different tax year is picked', async () => {
    getTaxEstimate.mockResolvedValueOnce(makeTaxEstimate());
    getTaxEstimate.mockResolvedValueOnce(
      makeTaxEstimate({
        startYear: 2025,
        monthlyIncome: { '2025-04': [0, 0], '2026-01': [0, 0], '2025-06': [1500, 2] },
        totals: { gross: 1500, taxBeforeRebate: 270, estimatedTax: 0, takeHome: 1500, effectiveRatePercent: 0 },
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<Income />, { user: freelancer });

    const select = await screen.findByLabelText('Tax year');
    expect(select).toHaveValue('2026');
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      '2026/27 tax year',
      '2025/26 tax year',
      '2024/25 tax year',
      '2023/24 tax year',
    ]);

    await user.selectOptions(select, '2025');

    expect(await screen.findByText(/Showing 1 March 2025 to 28 February 2026/)).toBeInTheDocument();
    expect(getTaxEstimate).toHaveBeenLastCalledWith(2025, expect.anything());
    expect(getTaxEstimate).toHaveBeenCalledTimes(2);
    expect(statValue('Total earned')).toMatch(/R\s1\s500,00/);
    expect(screen.getByLabelText('Tax year')).toHaveValue('2025');
  });

  it('shows an empty state when there is no income in the tax year', async () => {
    getTaxEstimate.mockResolvedValue(makeTaxEstimate({ monthlyIncome: { '2026-04': [0, 0], '2027-01': [0, 0] }, totals: emptyTotals }));
    renderWithProviders(<Income />, { user: freelancer });

    expect(await screen.findByRole('heading', { name: 'No income in this tax year yet' })).toBeInTheDocument();
    expect(statValue('Total earned')).toMatch(/R\s0,00/);
    expect(statValue('Effective tax rate')).toBe('0,00%');
    expect(screen.queryByRole('img', { name: /monthly income/i })).not.toBeInTheDocument();
    // The assumptions are still shown with zero income.
    expect(screen.getByRole('complementary', { name: 'How this estimate works' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No income yet' })).toBeInTheDocument();
  });

  it('shows the error and lets the user try again', async () => {
    getTaxEstimate.mockRejectedValueOnce(new ApiError('Too many requests, please try again in 60 seconds.', 429));
    getTaxEstimate.mockResolvedValueOnce(makeTaxEstimate());
    const user = userEvent.setup();
    renderWithProviders(<Income />, { user: freelancer });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Too many requests, please try again in 60 seconds.');
    expect(screen.queryByText('Estimated tax', { selector: '.stat-label' })).not.toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/Showing 1 March 2026/)).toBeInTheDocument();
    expect(getTaxEstimate).toHaveBeenCalledTimes(2);
  });

  it('shows a loading state first', async () => {
    getTaxEstimate.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Income />, { user: freelancer });
    // Both the estimate and the per-booking table show their own loading state.
    expect(screen.getByText('Loading your income and tax estimate…')).toHaveAttribute('role', 'status');
    expect(screen.queryByText('Total earned', { selector: '.stat-label' })).not.toBeInTheDocument();
  });

  it('still lists income per booking', async () => {
    getTaxEstimate.mockResolvedValue(makeTaxEstimate());
    getIncome.mockResolvedValue({
      totalEarned: 1049.98,
      bookingCount: 2,
      items: [
        { bookingId: 'b1', gigTitle: 'Logo &amp; branding', amount: 899.99, date: '2026-10-09T09:00:00Z', reference: 'TXN-20261009-AAAAAAAAAAAA' },
        { bookingId: 'b2', gigTitle: 'Blog post', amount: 149.99, date: '2026-10-08T09:00:00Z', reference: 'TXN-20261008-BBBBBBBBBBBB' },
      ],
    });
    renderWithProviders(<Income />, { user: freelancer });

    const table = await screen.findByRole('table', { name: 'Income per booking, newest first' });
    expect(within(table).getByText('Logo & branding')).toBeInTheDocument();
    expect(within(table).getByText('TXN-20261009-AAAAAAAAAAAA')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(3); // header + 2 items
    expect(screen.getByText(/All time: R\s1\s049,98 from 2 bookings/)).toBeInTheDocument();
  });

  it('does not link to a source that is not the SARS site', async () => {
    const estimate = makeTaxEstimate();
    estimate.source = { ...estimate.source, url: 'javascript:alert(1)' };
    getTaxEstimate.mockResolvedValue(estimate);
    renderWithProviders(<Income />, { user: freelancer });

    await screen.findByText(/Showing 1 March 2026/);
    await waitFor(() => expect(screen.queryByRole('link', { name: /SARS/ })).not.toBeInTheDocument());
  });
});
