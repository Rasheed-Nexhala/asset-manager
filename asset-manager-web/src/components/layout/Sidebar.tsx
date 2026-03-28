import { NavLink, Link } from 'react-router-dom';
import { companyConfig } from '../../config/company';
import { useAppSelector } from '../../store/hooks';
import {
  selectIsAdminOrSuperAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
  selectUserDisplayName,
  selectUserRoleType,
  selectCanViewRequestQueue,
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
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const canViewRequestQueue = useAppSelector(selectCanViewRequestQueue);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const displayName = useAppSelector(selectUserDisplayName);
  const roleType = useAppSelector(selectUserRoleType);

  const showInventory = isAdminOrSuperAdmin || isStoreIncharge || isSiteManager;
  const showRequests = canViewRequestQueue || isSiteManager;
  const showPurchaseOrders = isAdminOrSuperAdmin || isStoreIncharge;
  const showMaintenance = isAdminOrSuperAdmin || isStoreIncharge;

  const requestsTo =
    isSiteManager && !canViewRequestQueue
      ? '/requests/my-requests'
      : canViewRequestQueue
        ? '/requests/queue'
        : '/requests/my-requests';

  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: 'squares-2x2', show: true },
    { to: '/activity', label: 'Activity Log', icon: 'document-text', show: isAdminOrSuperAdmin },
    { to: '/inventory', label: 'Inventory', icon: 'cube', show: showInventory },
    { to: requestsTo, label: 'Requests', icon: 'inbox', show: showRequests },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: 'document-text', show: showPurchaseOrders },
    { to: '/maintenance', label: 'Maintenance', icon: 'wrench-screwdriver', show: showMaintenance },
    {
      to: '/vendors',
      label: 'Vendors',
      icon: 'building-storefront',
      show: isAdminOrSuperAdmin || isStoreIncharge,
    },
    { to: '/sites', label: 'Sites', icon: 'building-office-2', show: isAdminOrSuperAdmin },
    { to: '/admin/users', label: 'Users', icon: 'users', show: isAdminOrSuperAdmin },
    { to: '/profile', label: 'Profile', icon: 'user-circle', show: true },
  ];

  const visibleItems = navItems.filter((item) => item.show);

  return (
    <aside
      className="sidebar hidden md:flex md:w-64 md:flex-col md:bg-slate-900 md:text-white"
      aria-label="Main navigation"
    >
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-slate-800 px-6">
        <Link
          to="/dashboard"
          className="flex items-center justify-center rounded-lg bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-opacity hover:opacity-90 min-h-[44px] min-w-[44px]"
          aria-label={`${companyConfig.appName} - Go to dashboard`}
        >
          <img
            src={companyConfig.logoPath}
            alt={companyConfig.logoAlt}
            className="h-9 max-h-[40px] w-auto max-w-[180px] object-contain object-center"
          />
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
              {item.to === '/inventory' && isSiteManager && (
                <ul
                  className="mt-1 space-y-0.5 border-l border-slate-700 py-1 pl-3 ml-4"
                  role="group"
                  aria-label="Site team"
                >
                  <li className="px-3 pb-1 pt-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Site team
                    </span>
                  </li>
                  <li>
                    <NavLink
                      to="/inventory/divide-to-supervisors"
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        )
                      }
                    >
                      <Icon name="arrows-right-left" className="h-4 w-4 shrink-0" />
                      Split stock
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/inventory/site-supervisors"
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        )
                      }
                    >
                      <Icon name="users" className="h-4 w-4 shrink-0" />
                      Team list
                    </NavLink>
                  </li>
                </ul>
              )}
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
