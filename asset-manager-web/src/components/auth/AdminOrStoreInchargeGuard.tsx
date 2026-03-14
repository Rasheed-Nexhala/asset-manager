import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import {
  selectIsAuthenticated,
  selectIsAdmin,
  selectIsStoreIncharge,
  selectRoleLoading,
} from '../../store/selectors/authSelectors';
import { LoadingSpinner } from '../shared/LoadingSpinner';

/**
 * Protects routes that require Admin or StoreIncharge role.
 * Used for: Maintenance, Vendors (via PO stack), Purchase Orders, Request Queue, etc.
 * - If not authenticated: redirects to /login
 * - If authenticated but not Admin/StoreIncharge: redirects to /dashboard
 * - If role still loading: shows full-screen spinner
 * - Otherwise: renders child routes via <Outlet />
 */
export function AdminOrStoreInchargeGuard(): ReactNode {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isRoleLoading = useAppSelector(selectRoleLoading);

  const hasAccess = isAdmin || isStoreIncharge;

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

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
