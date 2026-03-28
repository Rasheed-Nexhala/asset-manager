import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import {
  selectIsAuthenticated,
  selectCanViewRequestQueue,
  selectRoleLoading,
} from '../../store/selectors/authSelectors';
import { LoadingSpinner } from '../shared/LoadingSpinner';

/**
 * Routes for viewing the site request queue (list + read-only detail from queue).
 * Admin: view only. Store Incharge / SuperAdmin: view + staff actions on other routes.
 */
export function RequestQueueViewGuard(): ReactNode {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const canViewRequestQueue = useAppSelector(selectCanViewRequestQueue);
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

  if (!canViewRequestQueue) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
