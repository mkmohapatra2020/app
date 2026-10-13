import { Navigate, useLocation } from 'react-router-dom';
import useSession from '../../hooks/useSession.js';

// Redirects to /login (and back afterwards) when not signed in.
export default function RequireAuth({ children, admin = false }) {
  const { isAuthenticated, isAdmin } = useSession();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && !isAdmin) {
    return (
      <div className="wrap page-body"><div className="empty"><span aria-hidden="true">🔒</span><h3>Admins only</h3><p>Your account doesn't have access to this page.</p></div></div>
    );
  }
  return children;
}
