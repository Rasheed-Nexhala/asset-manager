import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUserId } from '../../store/selectors/authSelectors';
import { selectAllSites, selectManagedSitesForUser } from '../../store/selectors/sitesSelectors';
import { fetchSites, setSites } from '../../store/slices/sitesSlice';
import { subscribeToSites } from '../../services/firebase/siteService';
import type { Site } from '../../types/sites';
import { InventorySubNav } from '../../components/inventory';
import { Icon } from '../../components/shared/Icon';

export function OtherSitesListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const sites = useAppSelector(selectAllSites);
  const managedSites = useAppSelector(selectManagedSitesForUser(userId));

  useEffect(() => {
    dispatch(fetchSites());
    const unsubscribe = subscribeToSites((updated: Site[]) => dispatch(setSites(updated)));
    return () => unsubscribe();
  }, [dispatch]);

  const managedIds = useMemo(
    () => new Set(managedSites.map((s) => s.id)),
    [managedSites]
  );

  const otherSites = useMemo(() => {
    const safe = Array.isArray(sites) ? sites : [];
    return safe.filter((s) => !managedIds.has(s.id) && s.status === 'active');
  }, [sites, managedIds]);

  return (
    <div className="flex flex-col h-full">
      <InventorySubNav />
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-[22px] font-semibold text-slate-900 mb-4">Other Sites</h2>
        <p className="text-[15px] text-slate-500 mb-4">
          Sites you don&apos;t manage — view only. Request transfers to your active working site from
          inventory actions.
        </p>
        {otherSites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Icon name="building-office-2" className="w-16 h-16 text-slate-400" />
            <p className="text-[22px] font-semibold text-slate-900 mt-4">No Other Sites</p>
            <p className="text-[15px] text-slate-500 text-center">
              There are no other active sites to view.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {otherSites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => navigate(`/inventory/other-sites/${site.id}`)}
                className="w-full bg-white rounded-[10px] p-4 border border-slate-200 flex items-center justify-between min-h-[56px] text-left hover:border-slate-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-slate-900">{site.name}</p>
                  {site.address && (
                    <p className="text-[13px] text-slate-500 truncate">{site.address}</p>
                  )}
                </div>
                <Icon name="chevron-right" className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
