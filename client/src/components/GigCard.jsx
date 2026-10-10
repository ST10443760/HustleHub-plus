import { Link } from 'react-router-dom';
import { formatCategory, formatDays, formatMoney } from '../utils/format';
import { decodeEntities } from '../utils/text';

// All text from the API is decoded for display and rendered as plain text
// by React - never as HTML.
export default function GigCard({ gig }) {
  const title = decodeEntities(gig.title);
  const freelancerName = gig.freelancer ? decodeEntities(gig.freelancer.name) : 'Unknown freelancer';

  return (
    <article className="card gig-card">
      <h2>
        <Link to={`/gigs/${gig.id}`}>{title}</Link>
      </h2>
      <ul className="gig-meta">
        <li>{formatCategory(decodeEntities(gig.category))}</li>
        <li>Delivery in {formatDays(gig.deliveryDays)}</li>
        <li>by {freelancerName}</li>
      </ul>
      <p className="price">{formatMoney(gig.price)}</p>
    </article>
  );
}
