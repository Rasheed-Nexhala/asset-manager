import { NavLink, Link } from 'react-router-dom';
import { companyConfig } from '../../config/company';
import { useAppSelector } from '../../store/hooks';
import {
  selectIsAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
} from '../../store/selectors/authSelectors';
import { Icon } from '../shared/Icon';
import { clsx } from 'clsx';

interface NavItem {
  to: string;
  label: string;
  icon: 'squares-2x2' | 'cube' | 'inbox' | 'document-text' | 'building-office-2' | 'building-storefront' | 'users' | 'wrench-screwdriver' | 'user-circle';
  show: boolean;
}

export function Sidebar() {
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);

  const showInventory = isAdmin || isStoreIncharge || isSiteManager;
  const showRequests = isAdmin || isStoreIncharge || isSiteManager;
  const showPurchaseOrders = isAdmin || isStoreIncharge;
  const showMaintenance = isAdmin || isStoreIncharge;

  const requestsTo = isAdmin || isStoreIncharge ? '/requests/queue' : '/requests/my-requests';

  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: 'squares-2x2', show: true },
    { to: '/activity', label: 'Activity Log', icon: 'document-text', show: isAdmin },
    { to: '/inventory', label: 'Inventory', icon: 'cube', show: showInventory },
    { to: requestsTo, label: 'Requests', icon: 'inbox', show: showRequests },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: 'document-text', show: showPurchaseOrders },
    { to: '/maintenance', label: 'Maintenance', icon: 'wrench-screwdriver', show: showMaintenance },
    { to: '/vendors', label: 'Vendors', icon: 'building-storefront', show: isAdmin },
    { to: '/sites', label: 'Sites', icon: 'building-office-2', show: isAdmin },
    { to: '/admin/users', label: 'Users', icon: 'users', show: isAdmin },
    { to: '/profile', label: 'Profile', icon: 'user-circle', show: true },
  ];

  const visibleItems = navItems.filter((item) => item.show);

  return (
    <aside
      className="sidebar hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-200 md:bg-white"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center border-b border-slate-200 px-4">
        <Link
          to="/dashboard"
          className="text-[17px] font-semibold text-slate-900 hover:text-slate-700"
        >
          {companyConfig.appName}
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to !== '/inventory'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                <Icon name={item.icon} className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
