import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGig, updateGig } from '../api/gigs';
import { renderWithProviders } from '../test/renderWithProviders';
import GigEditor from './GigEditor';

vi.mock('../api/gigs', async (importOriginal) => ({
  ...(await importOriginal()),
  getGig: vi.fn(),
  updateGig: vi.fn(),
  createGig: vi.fn(),
}));

const GIG_ID = 'e'.repeat(24);
const owner = { id: 'owner-1', name: 'Sipho', role: 'freelancer' };

// As the API stores it: "Tom & Jerry's <logos>" escaped once.
const storedGig = {
  id: GIG_ID,
  title: 'Tom &amp; Jerry&#x27;s &lt;logos&gt;',
  description: 'Fast &amp; friendly &quot;logo&quot; work',
  price: 199.99,
  category: 'design',
  deliveryDays: 4,
  isActive: true,
  freelancer: { id: 'owner-1', name: 'Sipho' },
};

function renderEditor(user = owner) {
  return renderWithProviders(<GigEditor />, {
    user,
    route: `/freelancer/gigs/${GIG_ID}/edit`,
    path: '/freelancer/gigs/:id/edit',
  });
}

beforeEach(() => {
  getGig.mockResolvedValue({ gig: storedGig });
});

describe('GigEditor (edit mode)', () => {
  it('pre-fills the form with decoded text', async () => {
    renderEditor();

    expect(await screen.findByLabelText('Title')).toHaveValue("Tom & Jerry's <logos>");
    expect(screen.getByLabelText('Description')).toHaveValue('Fast & friendly "logo" work');
    expect(screen.getByLabelText('Price (R)')).toHaveValue('199.99');
    expect(screen.getByLabelText('Delivery days')).toHaveValue('4');
    expect(screen.getByLabelText('Category')).toHaveValue('design');
  });

  it('saves the raw typed text so the api escapes it exactly once (no &amp;amp;)', async () => {
    const user = userEvent.setup();
    updateGig.mockResolvedValue({ gig: storedGig });
    renderEditor();
    await screen.findByLabelText('Title');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(updateGig).toHaveBeenCalledWith(GIG_ID, {
      title: "Tom & Jerry's <logos>",
      description: 'Fast & friendly "logo" work',
      price: 199.99,
      category: 'design',
      deliveryDays: 4,
    });
    expect(JSON.stringify(updateGig.mock.calls[0][1])).not.toContain('&amp;');
    expect(await screen.findByTestId('location')).toHaveTextContent('/freelancer/gigs');
  });

  it("refuses to show the form for someone else's gig", async () => {
    renderEditor({ id: 'someone-else', name: 'Lebo', role: 'freelancer' });

    expect(await screen.findByText('You can only edit your own gigs.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });
});
