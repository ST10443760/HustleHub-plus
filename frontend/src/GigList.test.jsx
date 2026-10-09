
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import GigList from './GigList.jsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HustleHub+ Gig Browsing', () => {
  it('displays sample gigs when the API is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404
    });

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

    expect(
      await screen.findByText(/Demo mode: Showing sample gigs/i)
    ).toBeInTheDocument();
  });

  it('filters gigs when the user searches', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404
    });

    render(<GigList />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Search gigs'
    });

    fireEvent.change(searchInput, {
      target: { value: 'Math' }
    });

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

  it('displays real gigs when the API responds successfully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'gig-123',
          title: 'React Developer Needed',
          category: 'Technology',
          location: 'Remote',
          price: 1500,
          description: 'Build a React website.'
        }
      ]
    });

    render(<GigList />);

    expect(
      await screen.findByText('React Developer Needed')
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Math Tutor Needed')
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(/Demo mode: Showing sample gigs/i)
    ).not.toBeInTheDocument();
  });
});
