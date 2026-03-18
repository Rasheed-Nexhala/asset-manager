import { NavLink } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectIsAdmin, selectIsStoreIncharge, selectIsSiteManager } from '../../store/selectors/authSelectors';
import { Icon } from '../shared/Icon';
import { clsx } from 'clsx';

const allTabs = [
  { to: '/inventory', end: true, label: 'My Site', icon: 'map-pin' as const, roles: ['SiteManager'] as const },
  { to: '/inventory/central', end: false, label: 'Central Store', icon: 'building-storefront' as const, roles: ['Admin', 'StoreIncharge'] as const },
  { to: '/inventory/other-sites', end: false, label: 'Other Sites', icon: 'building-office-2' as const, roles: ['SiteManager'] as const },
  { to: '/inventory/steel-master', end: false, label: 'Custom Items', icon: 'chart-bar-square' as const, roles: ['Admin', 'StoreIncharge'] as const },
];

export function InventorySubNav() {
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);

  const role = isAdmin ? 'Admin' : isStoreIncharge ? 'StoreIncharge' : isSiteManager ? 'SiteManager' : null;
  const tabs = role
    ? allTabs.filter((tab) => (tab.roles as readonly string[]).includes(role))
    : allTabs.filter((t) => (t.roles as readonly string[]).includes('SiteManager'));
  return (
    <nav
      className="border-b border-slate-200 bg-white px-4 md:px-6"
      aria-label="Inventory sections"
    >
      <div className="flex gap-1 overflow-x-auto -mb-px scrollbar-hide">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2 px-4 py-3 text-[15px] font-medium whitespace-nowrap border-b-2 transition-colors min-h-[48px]',
                isActive
                  ? 'border-blue-800 text-blue-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              )
            }
          >
            <Icon name={tab.icon} className="w-5 h-5" />
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
