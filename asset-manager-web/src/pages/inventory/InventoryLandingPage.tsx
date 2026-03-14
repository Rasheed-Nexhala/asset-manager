import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectIsAdmin, selectIsStoreIncharge } from '../../store/selectors/authSelectors';
import { MySiteInventoryPage } from './MySiteInventoryPage';

/**
 * Role-based inventory landing:
 * - Admin/StoreIncharge: redirect to Central Store
 * - SiteManager: show My Site inventory
 */
export function InventoryLandingPage() {
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);

  if (isAdmin || isStoreIncharge) {
    return <Navigate to="/inventory/central" replace />;
  }

  return <MySiteInventoryPage />;
}
