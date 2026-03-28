import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import {
  selectIsAuthenticated,
  selectCanManageRequests,
  selectRoleLoading,
} from '../../store/selectors/authSelectors';
import { LoadingSpinner } from '../shared/LoadingSpinner';

/**
 * Mutating request flows: reject, confirm transfer. Store Incharge + SuperAdmin only.
 */
export function RequestQueueStaffGuard(): ReactNode {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const canManageRequests = useAppSelector(selectCanManageRequests);
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

  if (!canManageRequests) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
