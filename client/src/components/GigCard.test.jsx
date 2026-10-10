import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import GigCard from './GigCard';

const gig = {
  id: 'a'.repeat(24),
  // Exactly what the API returns for a title typed as <img src=x onerror=alert(1)>
  title: '&lt;img src=x onerror=alert(1)&gt;',
  price: 250,
  category: 'design',
  deliveryDays: 3,
  freelancer: { id: 'f1', name: 'Tom &amp; Jerry&#x27;s Studio' },
};

describe('GigCard', () => {
  it('renders an escaped malicious title as text, with no img element', () => {
    const { container } = renderWithProviders(<GigCard gig={gig} />);

    expect(screen.getByRole('link', { name: '<img src=x onerror=alert(1)>' })).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows price, category, delivery time and the decoded freelancer name', () => {
    renderWithProviders(<GigCard gig={gig} />);

    expect(screen.getByText(/R\s250,00/)).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Delivery in 3 days')).toBeInTheDocument();
    expect(screen.getByText("by Tom & Jerry's Studio")).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', `/gigs/${gig.id}`);
  });
});
