import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import {
  selectIsAuthenticated,
  selectRoleLoading,
} from '../../store/selectors/authSelectors';
import { LoadingSpinner } from '../shared/LoadingSpinner';

/**
 * Protects routes that require authentication.
 * - If not authenticated: redirects to /login
 * - If authenticated but role still loading: shows full-screen spinner
 * - Otherwise: renders child routes via <Outlet />
 */
export function AuthGuard(): ReactNode {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isRoleLoading = useAppSelector(selectRoleLoading);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isRoleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <Outlet />;
}
