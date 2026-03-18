import { useState, useCallback } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { companyConfig } from '../../config/company';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signOutUser } from '../../store/slices/authSlice';
import {
  selectIsAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
  selectUserId,
  selectUserRoleType,
} from '../../store/selectors/authSelectors';
import { selectUserDisplayName } from '../../store/selectors/authSelectors';
import { useUnreadNotificationCount } from '../../hooks/useUnreadNotificationCount';
import { Icon } from '../shared/Icon';
import { clsx } from 'clsx';

interface NavItem {
  to: string;
  label: string;
  icon: 'squares-2x2' | 'cube' | 'inbox' | 'document-text' | 'building-office-2' | 'building-storefront' | 'users' | 'wrench-screwdriver' | 'user-circle';
  show: boolean;
}

/**
 * Top header: Mobile (hamburger + CIAMS + profile) and Desktop (profile + notifications).
 * Unified user profile dropdown for both.
 */
export function TopHeader() {
  const dispatch = useAppDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const displayName = useAppSelector(selectUserDisplayName);
  const userId = useAppSelector(selectUserId);
  const roleType = useAppSelector(selectUserRoleType);
  const unreadCount = useUnreadNotificationCount(userId);
  const showNotifications = roleType !== 'Unassigned';

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
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleLogout = useCallback(async () => {
    setProfileOpen(false);
    try {
      await dispatch(signOutUser()).unwrap();
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [dispatch]);

  const profileDropdown = (
    <>
      {profileOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setProfileOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
            <div className="border-b border-slate-100 px-4 py-2">
              <p className="truncate text-[15px] font-medium text-slate-900">
                {displayName ?? 'User'}
              </p>
            </div>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                clsx(
                  'block px-4 py-2 text-[15px]',
                  isActive ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
                )
              }
              onClick={() => setProfileOpen(false)}
            >
              Profile
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full px-4 py-2 text-left text-[15px] text-slate-700 hover:bg-slate-50"
              aria-label="Sign out"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      <header className="top-header flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Open menu"
        >
          <Icon name="bars-3" className="h-6 w-6" />
        </button>

        {/* Mobile: center title (links to dashboard); Desktop: empty */}
        <Link
          to="/dashboard"
          className="flex-1 text-center text-[17px] font-semibold text-slate-900 hover:text-slate-700 md:hidden"
        >
          {companyConfig.appName}
        </Link>

        {/* Notifications bell + Profile (both mobile and desktop) */}
        <div className="flex items-center gap-2 md:flex-1 md:justify-end">
          {showNotifications && (
            <Link
              to="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <Icon name="bell" className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100 md:gap-3 md:px-3"
              aria-label="User menu"
              aria-expanded={profileOpen}
            >
              <Icon name="user-circle" className="h-6 w-6 text-slate-500" />
              <span className="hidden text-[15px] font-medium md:block">
                {displayName ?? 'User'}
              </span>
              <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
            </button>
            {profileDropdown}
          </div>
        </div>
      </header>

      {/* Mobile slide-out drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
            aria-hidden
            onClick={closeDrawer}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl md:hidden"
            aria-label="Navigation menu"
          >
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <Link
                to="/dashboard"
                onClick={closeDrawer}
                className="text-[17px] font-semibold text-slate-900 hover:text-slate-700"
              >
                {companyConfig.appName}
              </Link>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <Icon name="x-mark" className="h-6 w-6" />
              </button>
            </div>
            <nav className="p-4">
              <ul className="space-y-1">
                {visibleItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to !== '/inventory'}
                      onClick={closeDrawer}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors',
                          isActive
                            ? 'bg-blue-50 text-blue-800'
                            : 'text-slate-700 hover:bg-slate-50'
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
        </>
      )}
    </>
  );
}
