import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectIsAdminOrSuperAdmin, selectIsStoreIncharge } from '../../store/selectors/authSelectors';
import { MySiteInventoryPage } from './MySiteInventoryPage';

/**
 * Role-based inventory landing:
 * - Admin/StoreIncharge: redirect to Central Store (preserving query params like lowStockFilter)
 * - SiteManager: show My Site inventory
 */
export function InventoryLandingPage() {
  const location = useLocation();
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);

  if (isAdminOrSuperAdmin || isStoreIncharge) {
    const search = location.search || '';
    return <Navigate to={`/inventory/central${search}`} replace />;
  }

  return <MySiteInventoryPage />;
}
