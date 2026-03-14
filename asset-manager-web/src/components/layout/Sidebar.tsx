import { NavLink, Link } from 'react-router-dom';
import { companyConfig } from '../../config/company';
import { useAppSelector } from '../../store/hooks';
import {
  selectIsAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
  selectUserDisplayName,
  selectUserRoleType,
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
  const displayName = useAppSelector(selectUserDisplayName);
  const roleType = useAppSelector(selectUserRoleType);

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
      className="sidebar hidden md:flex md:w-64 md:flex-col md:bg-slate-900 md:text-white"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <Link
          to="/dashboard"
          className="text-xl font-bold tracking-tight text-white hover:text-blue-400 transition-colors"
        >
          {companyConfig.appName}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to !== '/inventory'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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

      {/* User Profile Section */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-800 text-xs font-bold shadow-inner">
            {displayName?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-white">{displayName || 'User'}</p>
            <p className="truncate text-xs text-slate-400">{roleType || 'Member'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
