import { Link, NavLink, Outlet } from 'react-router-dom';
import useAuth from '../context/useAuth';
import { decodeEntities } from '../utils/text';

// Nav links per role. Freelancer and admin pages arrive in the next batch;
// their routes show a "coming soon" page until then.
const NAV_LINKS = {
  client: [
    { to: '/gigs', label: 'Browse gigs' },
    { to: '/bookings', label: 'My bookings' },
    { to: '/transactions', label: 'My transactions' },
  ],
  freelancer: [
    { to: '/gigs', label: 'Browse gigs' },
    { to: '/freelancer/gigs', label: 'My gigs' },
    { to: '/freelancer/bookings', label: 'Bookings' },
    { to: '/income', label: 'Income' },
  ],
  admin: [
    { to: '/gigs', label: 'Browse gigs' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/transactions', label: 'Transactions' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const links = user ? NAV_LINKS[user.role] || [] : [];

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container">
          <Link to={user ? '/gigs' : '/'} className="brand">
            HustleHub<span>+</span>
          </Link>

          <nav aria-label="Main">
            <ul className="nav-links">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to}>{link.label}</NavLink>
                </li>
              ))}
              {!user && (
                <>
                  <li>
                    <NavLink to="/login">Log in</NavLink>
                  </li>
                  <li>
                    <NavLink to="/register">Register</NavLink>
                  </li>
                </>
              )}
            </ul>
          </nav>

          {user && (
            <div className="nav-user">
              <span>
                <span className="nav-user-name">{decodeEntities(user.name)}</span>{' '}
                <span className="role-badge">{user.role}</span>
              </span>
              <button type="button" className="button secondary" onClick={logout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <div className="container">
          <Outlet />
        </div>
      </main>
    </>
  );
}
