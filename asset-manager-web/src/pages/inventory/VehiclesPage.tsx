import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import {
  selectIsStoreIncharge,
  selectIsAdminOrSuperAdmin,
  selectIsSiteManager,
} from '../../store/selectors/authSelectors';
import { listVehicles } from '../../services/firebase/vehicleService';
import { getTotalLitersAssignedToVehicle } from '../../services/firebase/vehicleFuelAssignmentService';
import type { Vehicle } from '../../types/vehicle';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { InventorySubNav } from '../../components/inventory/InventorySubNav';
import { useToast } from '../../contexts/ToastContext';
import { filterVehiclesBySearch } from '../../utils/vehicleNumberUtils';

export function VehiclesPage() {
  const canManage = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const canCreateVehicle = canManage || isSiteManager;
  const isOverview = useAppSelector(selectIsAdminOrSuperAdmin) && !canManage;
  const toast = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVehicles = useMemo(
    () => filterVehiclesBySearch(vehicles, searchQuery),
    [vehicles, searchQuery]
  );

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await listVehicles();
      setVehicles(list);
      const t: Record<string, number> = {};
      await Promise.all(
        list.map(async (v) => {
          t[v.id] = await getTotalLitersAssignedToVehicle(v.id);
        })
      );
      setTotals(t);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load vehicles';
      console.error('VehiclesPage load:', e);
      setLoadError(msg);
      toast.error(msg);
      setVehicles([]);
      setTotals({});
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <InventorySubNav />
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6 lg:px-8">
          <Link
            to="/inventory/central"
            className="-ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-slate-50"
            aria-label="Back"
          >
            <Icon name="arrow-left" className="h-6 w-6" />
          </Link>
          <h1 className="min-w-0 flex-1 text-center text-[22px] font-semibold text-slate-900 md:text-left md:pl-2">
            Vehicles
          </h1>
          {canCreateVehicle ? (
            <Link
              to="/inventory/vehicles/new"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-blue-800 transition-colors hover:bg-blue-50"
              aria-label="Add vehicle"
            >
              <Icon name="plus-circle" className="h-7 w-7" />
            </Link>
          ) : (
            <span className="w-12 shrink-0" />
          )}
        </div>
      </header>

      {isOverview && (
        <div className="shrink-0 border-b border-slate-200 bg-slate-600/10">
          <div className="mx-auto max-w-6xl px-4 py-2 md:px-6 lg:px-8">
            <p className="text-[13px] text-slate-600">
              Overview only — fuel assignment is managed by Store Incharge.
            </p>
          </div>
        </div>
      )}

      {isSiteManager && !canManage && (
        <div className="shrink-0 border-b border-slate-200 bg-amber-600/10">
          <div className="mx-auto max-w-6xl px-4 py-2 md:px-6 lg:px-8">
            <p className="text-[13px] text-slate-700">
              Site Manager: add vehicles here for your site. Dispense fuel from transferred requests on each request’s
              detail page. Assigning fuel directly from the central store is done by Store Incharge only.
            </p>
          </div>
        </div>
      )}

      {!loading && !loadError && vehicles.length > 0 && (
        <div className="shrink-0 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3 md:px-6 lg:px-8">
            <div className="flex h-12 items-center gap-3 rounded-full bg-slate-100 px-4">
              <Icon name="magnifying-glass" className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                type="search"
                placeholder="Search by vehicle number or notes…"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search vehicles"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-slate-200"
                  aria-label="Clear search"
                >
                  <Icon name="x-mark" className="h-5 w-5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16" aria-busy="true" aria-live="polite">
              <LoadingSpinner size="lg" />
              <p className="text-[15px] text-slate-500">Loading vehicles…</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center py-12 text-center md:py-16">
              <p className="text-[17px] font-semibold text-slate-900">Could not load vehicles</p>
              <p className="mt-2 max-w-md text-[15px] text-slate-500">{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void load();
                }}
                className="mt-6 rounded-[10px] bg-blue-800 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-blue-900"
              >
                Try again
              </button>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center md:py-16">
              <Icon name="truck" className="h-14 w-14 text-slate-400" />
              <p className="mt-4 text-[17px] font-semibold text-slate-900">No vehicles yet</p>
              <p className="mt-2 max-w-md text-[15px] text-slate-500">
                {canCreateVehicle
                  ? canManage
                    ? 'Add a vehicle to assign fuel from the central store.'
                    : 'Add a vehicle to dispense fuel from transferred requests.'
                  : 'No vehicles registered.'}
              </p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center md:py-16">
              <Icon name="magnifying-glass" className="h-14 w-14 text-slate-400" />
              <p className="mt-4 text-[17px] font-semibold text-slate-900">No matching vehicles</p>
              <p className="mt-2 max-w-md text-[15px] text-slate-500">
                Try a different search term or clear the search to see all vehicles.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-6 rounded-[10px] bg-blue-800 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-blue-900"
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              {searchQuery.trim() ? (
                <p className="mb-3 text-[13px] text-slate-500">
                  Showing {filteredVehicles.length} of {vehicles.length} vehicles
                </p>
              ) : null}
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
              {filteredVehicles.map((v) => (
                <li key={v.id}>
                  <Link
                    to={`/inventory/vehicles/${v.id}`}
                    className="block rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 lg:p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-semibold text-slate-900">{v.vehicleNumber}</span>
                      <Icon name="chevron-right" className="h-5 w-5 shrink-0 text-slate-400" />
                    </div>
                    {v.notes ? (
                      <p className="mt-2 line-clamp-2 text-[13px] text-slate-500">{v.notes}</p>
                    ) : null}
                    <div className="mt-3 flex justify-between border-t border-slate-200 pt-2">
                      <span className="text-[13px] text-slate-500">Total fuel assigned</span>
                      <span className="text-[15px] font-semibold text-slate-900">
                        {(totals[v.id] ?? 0).toLocaleString('en-IN')} L
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
