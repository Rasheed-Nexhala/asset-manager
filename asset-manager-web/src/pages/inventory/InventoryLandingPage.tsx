import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectIsAdmin, selectIsStoreIncharge } from '../../store/selectors/authSelectors';
import { MySiteInventoryPage } from './MySiteInventoryPage';

/**
 * Role-based inventory landing:
 * - Admin/StoreIncharge: redirect to Central Store (preserving query params like lowStockFilter)
 * - SiteManager: show My Site inventory
 */
export function InventoryLandingPage() {
  const location = useLocation();
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);

  if (isAdmin || isStoreIncharge) {
    const search = location.search || '';
    return <Navigate to={`/inventory/central${search}`} replace />;
  }

  return <MySiteInventoryPage />;
}
