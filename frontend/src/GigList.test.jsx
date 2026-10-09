
//import { describe, it, expect } from 'vitest';
import { describe, it, expect, afterEach } from 'vitest';
//import { render, screen } from '@testing-library/react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import GigList from './GigList.jsx';

afterEach(() => {
  cleanup();
});
describe('HustleHub+ Gig Browsing', () => {
  it('displays the available gigs', () => {
    render(<GigList />);

    expect(
      screen.getByRole('heading', { name: 'Available Gigs' })
    ).toBeInTheDocument();

    expect(
      screen.getByText('Math Tutor Needed')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Website Design')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Event Photographer')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Garden Maintenance')
    ).toBeInTheDocument();
  });

  it('filters gigs when the user searches', async () => {
    const user = userEvent.setup();

    render(<GigList />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Search gigs',
    });

    await user.type(searchInput, 'Math');

    expect(
      screen.getByText('Math Tutor Needed')
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Website Design')
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('Event Photographer')
    ).not.toBeInTheDocument();
  });
});
