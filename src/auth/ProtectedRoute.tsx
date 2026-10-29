import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth.ts';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Only admins may see this route. */
  admin?: boolean;
}

/**
 * Sends signed-out visitors to /login (and back here afterwards). Waits while the stored
 * session is being restored. When the session ended with a 401, the login page is told
 * so it can say "your session expired".
 */
export function ProtectedRoute({ children, admin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, user, authExpired } = useAuth();
  const location = useLocation();

  // Restoring / refreshing the stored session: don't flash the login page or protected content.
  if (isInitializing) {
    return (
      <div className="wrap page-body" role="status" aria-live="polite">
        <div className="empty"><span aria-hidden="true">⏳</span><h3>Signing you in…</h3></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search, expired: authExpired }} />;
  }
  if (admin && !user?.isAdmin) {
    return (
      <div className="wrap page-body">
        <div className="empty" role="alert">
          <span aria-hidden="true">🔒</span>
          <h3>Admins only</h3>
          <p>Your account doesn&apos;t have access to this page.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default ProtectedRoute;
