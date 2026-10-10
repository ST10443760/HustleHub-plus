import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';
import NotAllowed from '../pages/NotAllowed';
import { LoadingState } from './StatusMessage';

/**
 * Wraps routes that need a logged-in user. With `roles`, only those roles
 * get through; anyone else sees a clear "not allowed" page.
 *
 * This only shapes the UI. The API enforces the same rules on every request,
 * so hiding a page here is never the thing keeping data safe.
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState label="Checking your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <NotAllowed />;
  }

  return children ?? <Outlet />;
}
