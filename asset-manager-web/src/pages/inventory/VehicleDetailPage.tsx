import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectIsStoreIncharge,
  selectIsAdminOrSuperAdmin,
  selectUserDisplayName,
  selectUserRoleType,
} from '../../store/selectors/authSelectors';
import { getVehicleById, deleteVehicleIfNoAssignments } from '../../services/firebase/vehicleService';
import {
  listAssignmentsByVehicle,
  assignFuelToVehicle,
} from '../../services/firebase/vehicleFuelAssignmentService';
import { listItems } from '../../services/firebase/inventoryService';
import { fetchSites } from '../../store/slices/sitesSlice';
import { selectAllSites } from '../../store/selectors/sitesSelectors';
import type { Vehicle } from '../../types/vehicle';
import type { VehicleFuelAssignment } from '../../types/vehicleFuelAssignment';
import type { Item } from '../../types/inventory';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { InventorySubNav } from '../../components/inventory/InventorySubNav';
import { useToast } from '../../contexts/ToastContext';

export function VehicleDetailPage() {
  const { vehicleId = '' } = useParams<{ vehicleId: string }>();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const canManage = useAppSelector(selectIsStoreIncharge);
  const isOverview = useAppSelector(selectIsAdminOrSuperAdmin) && !canManage;
  const userName = useAppSelector(selectUserDisplayName) ?? 'Unknown';
  const userRole = useAppSelector(selectUserRoleType) ?? 'Unassigned';
  const sites = useAppSelector(selectAllSites);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [assignments, setAssignments] = useState<VehicleFuelAssignment[]>([]);
  const [fuelItems, setFuelItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [siteId, setSiteId] = useState<string | null>(null);

  const totalLiters = useMemo(
    () => assignments.reduce((s, a) => s + a.quantityLiters, 0),
    [assignments]
  );

  const load = useCallback(async () => {
    const v = await getVehicleById(vehicleId);
    setVehicle(v);
    const rows = await listAssignmentsByVehicle(vehicleId);
    setAssignments(rows);
    const items = await listItems({ type: 'fuel', status: 'active' });
    setFuelItems(items);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => {
    dispatch(fetchSites());
  }, [dispatch]);

  useEffect(() => {
    if (!vehicleId) return;
    setLoading(true);
    void load();
  }, [vehicleId, load]);

  useEffect(() => {
    if (fuelItems.length > 0 && !selectedItemId) {
      setSelectedItemId(fuelItems[0].id);
    }
  }, [fuelItems, selectedItemId]);

  const handleAssign = async () => {
    if (!canManage) return;
    const q = parseFloat(qty);
    if (!selectedItemId || !Number.isFinite(q) || q <= 0) {
      toast.error('Select a fuel item and enter a valid quantity (liters).');
      return;
    }
    setSubmitting(true);
    try {
      await assignFuelToVehicle(
        {
          vehicleId,
          itemId: selectedItemId,
          quantityLiters: q,
          referenceSiteId: siteId,
          reason: reason.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        userName,
        userRole
      );
      setQty('');
      setReason('');
      setNotes('');
      await load();
      toast.success('Fuel assigned and central stock updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage || !vehicleId || !window.confirm('Delete only if no fuel history. Continue?')) return;
    try {
      await deleteVehicleIfNoAssignments(vehicleId);
      window.location.href = '/inventory/vehicles';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cannot delete');
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800';

  if (!vehicleId) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Link to="/inventory/vehicles" className="text-blue-800 hover:underline">
          Back to vehicles
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
        <InventorySubNav />
        <div
          className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16"
          aria-busy="true"
          aria-live="polite"
        >
          <LoadingSpinner size="lg" />
          <p className="text-[15px] text-slate-500">Loading vehicle…</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
        <InventorySubNav />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <p className="text-[17px] font-semibold text-slate-900">Vehicle not found</p>
          <Link to="/inventory/vehicles" className="text-[15px] font-semibold text-blue-800 hover:underline">
            Back to vehicles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <InventorySubNav />
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 md:px-6 lg:px-8">
          <Link
            to="/inventory/vehicles"
            className="-ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-slate-50"
            aria-label="Back"
          >
            <Icon name="arrow-left" className="h-6 w-6" />
          </Link>
          <h1 className="min-w-0 flex-1 truncate px-2 text-center text-[22px] font-semibold text-slate-900 md:text-left md:pl-2">
            {vehicle.vehicleNumber}
          </h1>
          {canManage ? (
            <Link
              to={`/inventory/vehicles/${vehicleId}/edit`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-slate-50"
              aria-label="Edit vehicle"
            >
              <Icon name="pencil-square" className="h-5 w-5 text-blue-800" />
            </Link>
          ) : (
            <span className="w-12 shrink-0" />
          )}
        </div>
      </header>

      {isOverview && (
        <div className="shrink-0 border-b border-slate-200 bg-slate-600/10">
          <div className="mx-auto max-w-6xl px-4 py-2 text-[13px] text-slate-600 md:px-6 lg:px-8">
            Read-only overview
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 md:space-y-6 md:px-6 md:py-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="space-y-4 lg:col-span-5">
              <div className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[13px] text-slate-500">Total assigned</p>
                  <p className="text-[32px] font-bold text-slate-900">
                    {totalLiters.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[13px] text-slate-500">Liters (all time)</p>
                </div>
                <div className="flex shrink-0 items-center">
                  <Icon name="truck" className="h-12 w-12 text-amber-700 md:h-14 md:w-14" />
                </div>
              </div>

              {vehicle.notes ? (
                <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <p className="mb-1 text-[13px] text-slate-500">Notes</p>
                  <p className="text-[15px] text-slate-900">{vehicle.notes}</p>
                </div>
              ) : null}

              {canManage && fuelItems.length > 0 && (
                <div className="space-y-3 rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <h2 className="text-[17px] font-semibold text-slate-900">Assign fuel</h2>
                  <p className="text-[13px] text-slate-500">
                    Deducts from central store. This cannot be returned from the vehicle.
                  </p>
                  <div>
                    <span className="mb-2 block text-[15px] text-slate-900">Fuel item</span>
                    <div className="flex flex-wrap gap-2">
                      {fuelItems.map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setSelectedItemId(it.id)}
                          className={`min-h-[48px] rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
                            selectedItemId === it.id
                              ? 'border-blue-800 bg-blue-800 text-white'
                              : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                          }`}
                        >
                          {it.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="qty" className="mb-1.5 block text-[15px] text-slate-900">
                      Quantity (L) *
                    </label>
                    <input
                      id="qty"
                      type="number"
                      inputMode="decimal"
                      className={`${inputClass} h-12`}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="mb-2 block text-[15px] text-slate-900">Reference site (optional)</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSiteId(null)}
                        className={`min-h-[48px] rounded-lg border px-3 py-2 text-[13px] transition-colors ${
                          siteId == null
                            ? 'border-blue-800 bg-blue-800 text-white'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        None
                      </button>
                      {sites.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSiteId(s.id)}
                          className={`max-w-[220px] truncate rounded-lg border px-3 py-2 text-[13px] transition-colors md:max-w-[280px] ${
                            siteId === s.id
                              ? 'border-blue-800 bg-blue-800 text-white'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="reason" className="mb-1.5 block text-[15px] text-slate-900">
                      Reason (optional)
                    </label>
                    <input
                      id="reason"
                      className={`${inputClass} h-12`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="anotes" className="mb-1.5 block text-[15px] text-slate-900">
                      Notes (optional)
                    </label>
                    <textarea
                      id="anotes"
                      className={`${inputClass} min-h-[72px] py-2`}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={submitting}
                    aria-busy={submitting}
                    aria-disabled={submitting}
                    className={`inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] font-semibold text-white transition-colors md:w-auto md:min-w-[200px] ${
                      submitting ? 'bg-blue-800/80' : 'bg-blue-800 hover:bg-blue-900'
                    } disabled:opacity-80`}
                  >
                    {submitting ? (
                      <>
                        <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
                        <span>Assigning…</span>
                      </>
                    ) : (
                      'Assign fuel'
                    )}
                  </button>
                </div>
              )}

              {canManage && fuelItems.length === 0 && (
                <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
                  No active fuel items. Add a fuel-type item in Central Store first.
                </div>
              )}

              {canManage && assignments.length === 0 && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-[50px] w-full rounded-[10px] border border-red-600 font-semibold text-red-600 transition-colors hover:bg-red-50 md:w-auto md:min-w-[200px]"
                >
                  Delete vehicle
                </button>
              )}
            </div>

            <div className="mt-6 space-y-3 lg:sticky lg:top-4 lg:col-span-7 lg:mt-0">
              <h2 className="text-[17px] font-semibold text-slate-900">Consumption history</h2>
              {assignments.length === 0 ? (
                <p className="text-[15px] text-slate-500">No assignments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {assignments.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm md:p-5"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-[15px] font-semibold text-slate-900">{a.itemName}</span>
                        <span className="text-[15px] font-bold text-amber-700">{a.quantityLiters} L</span>
                      </div>
                      <p className="mt-2 text-[13px] text-slate-500">
                        {new Date(a.createdAt).toLocaleString()} · {a.assignedByName}
                      </p>
                      {a.referenceSiteName ? (
                        <p className="text-[13px] text-slate-500">Site: {a.referenceSiteName}</p>
                      ) : null}
                      {a.reason ? (
                        <p className="mt-1 text-[13px] text-slate-900">Reason: {a.reason}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
