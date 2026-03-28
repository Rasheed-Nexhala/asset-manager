import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import {
  selectIsAuthenticated,
  selectIsAdminOrSuperAdmin,
  selectIsStoreIncharge,
  selectRoleLoading,
} from '../../store/selectors/authSelectors';
import { LoadingSpinner } from '../shared/LoadingSpinner';

/**
 * Central-ops routes: Admin, SuperAdmin, or Store Incharge (inventory central, vendors, PO list, maintenance).
 * Request queue / approval uses {@link RequestQueueStaffGuard} instead (Store Incharge + SuperAdmin only).
 */
export function AdminOrStoreInchargeGuard(): ReactNode {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isRoleLoading = useAppSelector(selectRoleLoading);

  const hasAccess = isAdminOrSuperAdmin || isStoreIncharge;

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
