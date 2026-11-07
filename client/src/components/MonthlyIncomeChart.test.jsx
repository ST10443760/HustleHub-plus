import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTaxEstimate } from '../test/taxEstimateFixture';
import MonthlyIncomeChart from './MonthlyIncomeChart';

const { monthly } = makeTaxEstimate();

describe('MonthlyIncomeChart', () => {
  it('has an accessible summary on the SVG', () => {
    render(<MonthlyIncomeChart monthly={monthly} />);

    const chart = screen.getByRole('img', { name: /Bar chart of monthly income, Mar 2026 to Feb 2027/ });
    expect(chart.tagName.toLowerCase()).toBe('svg');
    expect(chart).toHaveAccessibleName(/Highest month: Jan 2027 with R\s199\s999,90/);
  });

  it('has a visually hidden table with every month', () => {
    render(<MonthlyIncomeChart monthly={monthly} />);

    const table = screen.getByRole('table', { name: 'Monthly income for the tax year' });
    expect(table).toHaveClass('visually-hidden');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(13); // header + 12 months
    expect(within(rows[2]).getByRole('rowheader')).toHaveTextContent('Apr 2026');
    expect(rows[2]).toHaveTextContent(/R\s100\s000,10/);
    expect(rows[2]).toHaveTextContent('3');
    expect(within(rows[1]).getByRole('rowheader')).toHaveTextContent('Mar 2026');
    expect(rows[1]).toHaveTextContent(/R\s0,00/);
  });

  it('draws a bar only for months with income', () => {
    render(<MonthlyIncomeChart monthly={monthly} />);
    expect(screen.getAllByTestId('chart-bar')).toHaveLength(2);
  });

  it('shows the value of a month on hover', () => {
    const { container } = render(<MonthlyIncomeChart monthly={monthly} />);
    const hitAreas = container.querySelectorAll('.chart-hit');
    expect(hitAreas).toHaveLength(12);

    fireEvent.mouseEnter(hitAreas[1]);
    expect(container.querySelector('.chart-value-label')).toHaveTextContent(/R\s100\s000,10 · 3 bookings/);
    expect(container.querySelector('.chart-bar.active')).not.toBeNull();

    fireEvent.mouseLeave(container.querySelector('svg'));
    expect(container.querySelector('.chart-value-label')).toBeNull();
  });

  it('uses no inline styles, so the strict CSP is never an issue', () => {
    const { container } = render(<MonthlyIncomeChart monthly={monthly} />);
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });
});
