
import { useState } from 'react';
import './GigList.css';
import GigDetails from './GigDetails.jsx';

// Temporary sample gigs for frontend development.
// Replace these with API data when the gig backend is ready.
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
  const [search, setSearch] = useState('');
  const [selectedGig, setSelectedGig] = useState(null);

  const filteredGigs = sampleGigs.filter((gig) => {
    const searchTerm = search.toLowerCase();

    return (
      gig.title.toLowerCase().includes(searchTerm) ||
      gig.category.toLowerCase().includes(searchTerm) ||
      gig.location.toLowerCase().includes(searchTerm)
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
              <span className="gig-category">{gig.category}</span>

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

        {filteredGigs.length === 0 && (
          <p role="status" className="gig-empty">
            No gigs found. Try a different search.
          </p>
        )}
      </main>
    </div>
  );
}

export default GigList;
