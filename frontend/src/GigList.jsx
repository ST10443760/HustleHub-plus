
import { useEffect, useState } from 'react';
import './GigList.css';
import GigDetails from './GigDetails.jsx';

// Demonstration data used until the gig API is available.
const sampleGigs = [
  {
    id: 1,
    title: 'Math Tutor Needed',
    category: 'Education',
    location: 'Johannesburg',
    price: 250,
    description: 'Help a Grade 10 learner prepare for a mathematics test.'
  },
  {
    id: 2,
    title: 'Website Design',
    category: 'Technology',
    location: 'Remote',
    price: 1200,
    description: 'Design a simple website for a small business.'
  },
  {
    id: 3,
    title: 'Event Photographer',
    category: 'Creative',
    location: 'Pretoria',
    price: 800,
    description: 'Take photos at a small weekend event.'
  },
  {
    id: 4,
    title: 'Garden Maintenance',
    category: 'Home Services',
    location: 'Sandton',
    price: 350,
    description: 'Help with mowing the lawn and general garden cleaning.'
  }
];

function GigList() {
  const [gigs, setGigs] = useState(sampleGigs);
  const [loading, setLoading] = useState(true);
  const [usingSampleData, setUsingSampleData] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGig, setSelectedGig] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadGigs = async () => {
      try {
        const token = sessionStorage.getItem('hustlehub_token');

        const response = await fetch(
          'https://localhost:5000/api/gigs',
          {
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : {},
            signal: controller.signal
          }
        );

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error('Unexpected gig data.');
        }

        if (!controller.signal.aborted) {
          setGigs(data);
          setUsingSampleData(false);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Using sample gigs:', error.message);

          if (!controller.signal.aborted) {
            setGigs(sampleGigs);
            setUsingSampleData(true);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadGigs();

    return () => controller.abort();
  }, []);

  const filteredGigs = gigs.filter((gig) => {
    const searchTerm = search.toLowerCase();

    return (
      (gig.title || '').toLowerCase().includes(searchTerm) ||
      (gig.category || '').toLowerCase().includes(searchTerm) ||
      (gig.location || '').toLowerCase().includes(searchTerm)
    );
  });

  if (selectedGig) {
    return (
      <GigDetails
        gig={selectedGig}
        onBack={() => setSelectedGig(null)}
      />
    );
  }

  return (
    <div className="gig-page">
      <header className="gig-header">
        <h1>HustleHub+</h1>
        <p>Discover opportunities that match your skills.</p>
      </header>

      <main className="gig-content">
        <h2>Available Gigs</h2>

        {loading && (
          <p role="status">Loading gigs...</p>
        )}

        {!loading && usingSampleData && (
          <p role="status">
            Demo mode: Showing sample gigs while the backend
            gig API is unavailable. These are not real bookings.
          </p>
        )}

        <input
          className="gig-search"
          type="search"
          placeholder="Search gigs by title, category or location..."
          aria-label="Search gigs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="gig-grid">
          {filteredGigs.map((gig) => (
            <article className="gig-card" key={gig.id}>
              <span className="gig-category">
                {gig.category}
              </span>

              <h3>{gig.title}</h3>

              <p>{gig.description}</p>

              <p>
                <strong>Location:</strong> {gig.location}
              </p>

              <p>
                <strong>Payment:</strong> R{gig.price}
              </p>

              <button
                type="button"
                className="gig-button"
                onClick={() => setSelectedGig(gig)}
              >
                View Details
              </button>
            </article>
          ))}
        </div>

        {!loading && filteredGigs.length === 0 && (
          <p role="status" className="gig-empty">
            {search
              ? 'No gigs found. Try a different search.'
              : 'No gigs are available yet.'}
          </p>
        )}
      </main>
    </div>
  );
}

export default GigList;
