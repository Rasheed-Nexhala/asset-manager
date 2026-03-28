import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectIsStoreIncharge } from '../../store/selectors/authSelectors';
import {
  createVehicle,
  updateVehicle,
  getVehicleById,
  countAssignmentsForVehicle,
} from '../../services/firebase/vehicleService';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { InventorySubNav } from '../../components/inventory/InventorySubNav';
import { useToast } from '../../contexts/ToastContext';

const inputBase =
  'w-full rounded-lg border border-slate-200 bg-white text-[15px] text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800';

export function AddEditVehiclePage() {
  const { vehicleId } = useParams<{ vehicleId?: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const canManage = useAppSelector(selectIsStoreIncharge);
  const isEdit = Boolean(vehicleId);

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const vehicleNumberLocked = isEdit && assignmentCount > 0;

  useEffect(() => {
    if (!canManage) {
      toast.error('Only Store Incharge can edit vehicles.');
      navigate('/inventory/vehicles');
    }
  }, [canManage, navigate, toast]);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    setNotFound(false);
    setLoading(true);
    (async () => {
      try {
        const [v, count] = await Promise.all([
          getVehicleById(vehicleId),
          countAssignmentsForVehicle(vehicleId),
        ]);
        if (cancelled) return;
        if (!v) {
          setNotFound(true);
          return;
        }
        setVehicleNumber(v.vehicleNumber);
        setNotes(v.notes ?? '');
        setAssignmentCount(count);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load vehicle';
          console.error('AddEditVehiclePage load:', e);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, toast]);

  const handleSave = useCallback(async () => {
    const num = vehicleNumber.trim();
    if (!num) {
      toast.error('Vehicle number is required.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && vehicleId) {
        if (vehicleNumberLocked) {
          await updateVehicle(vehicleId, { notes: notes.trim() || null });
        } else {
          await updateVehicle(vehicleId, { vehicleNumber: num, notes: notes.trim() || null });
        }
      } else {
        await createVehicle({ vehicleNumber: num, notes: notes.trim() || undefined });
      }
      navigate('/inventory/vehicles');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [vehicleNumber, notes, isEdit, vehicleId, vehicleNumberLocked, navigate, toast]);

  if (!canManage) return null;

  if (isEdit && notFound && !loading) {
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

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
        <InventorySubNav />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16" aria-busy="true" aria-live="polite">
          <LoadingSpinner size="lg" />
          <p className="text-[15px] text-slate-500">Loading vehicle…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <InventorySubNav />

      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:h-[60px] md:px-6 lg:px-8">
          <Link
            to="/inventory/vehicles"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] text-slate-700 transition-all duration-200 hover:bg-slate-100"
            aria-label="Back to vehicles"
          >
            <Icon name="arrow-left" className="h-6 w-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[22px] font-semibold leading-tight text-slate-900">
              {isEdit ? 'Edit vehicle' : 'Add vehicle'}
            </h1>
            <p className="hidden text-[13px] text-slate-500 md:block">Central store · Vehicles and fuel</p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-teal-600/15 px-3 py-1.5 text-center text-[12px] font-medium text-teal-700 sm:inline-block">
            Store Incharge
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <section
            className="overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm"
            aria-labelledby="vehicle-form-heading"
          >
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-5 md:px-6 md:py-6 lg:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-teal-600/15"
                    aria-hidden
                  >
                    <Icon name="truck" className="h-7 w-7 text-teal-700" />
                  </div>
                  <div>
                    <h2 id="vehicle-form-heading" className="text-[17px] font-semibold text-slate-900">
                      Vehicle details
                    </h2>
                    <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-500">
                      {isEdit
                        ? vehicleNumberLocked
                          ? 'Notes only — vehicle number is fixed after fuel has been assigned to this vehicle.'
                          : 'Update the registration or notes. The vehicle number must remain unique across the fleet.'
                        : 'Add a registration before assigning fuel from the central store. Each vehicle number must be unique.'}
                    </p>
                  </div>
                </div>
                <span className="inline-flex w-fit rounded-full bg-teal-600/15 px-3 py-1.5 text-[12px] font-medium text-teal-700 sm:hidden">
                  Store Incharge
                </span>
              </div>
            </div>

            <div className="px-4 py-6 md:px-6 md:py-8 lg:px-8">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 lg:items-start">
                <div className="flex flex-col gap-1.5 lg:col-span-5">
                  <label htmlFor="vn" className="text-[15px] text-slate-900">
                    Vehicle number <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="vn"
                    type="text"
                    readOnly={vehicleNumberLocked}
                    className={`${inputBase} h-12 px-4 ${
                      vehicleNumberLocked ? 'cursor-not-allowed bg-slate-100 text-slate-700' : ''
                    }`}
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. KA-01-AB-1234"
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                  <p className="text-[13px] text-slate-500">
                    {vehicleNumberLocked
                      ? 'Vehicle number cannot be changed after fuel has been assigned.'
                      : 'Use the official registration as on the number plate.'}
                  </p>
                </div>

                <div className="flex min-h-0 flex-col gap-1.5 lg:col-span-7">
                  <label htmlFor="notes" className="text-[15px] text-slate-900">
                    Notes <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    className={`${inputBase} min-h-[128px] resize-y px-4 py-3 lg:min-h-[192px]`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Driver name, vehicle type, fleet group, or other reference"
                    rows={6}
                  />
                </div>
              </div>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-4 md:flex-row md:items-center md:justify-end md:gap-4 md:px-6 md:py-5 lg:px-8">
              <Link
                to="/inventory/vehicles"
                className="inline-flex h-[50px] min-h-[48px] w-full items-center justify-center rounded-[10px] border-[1.5px] border-blue-800 text-[15px] font-semibold text-blue-800 transition-all duration-200 hover:bg-blue-50 md:w-auto md:min-w-[140px]"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                aria-busy={saving}
                aria-label={saving ? 'Saving vehicle, please wait' : 'Save vehicle'}
                className={`inline-flex h-[50px] min-h-[48px] w-full min-w-[160px] items-center justify-center gap-2 rounded-[10px] px-6 text-[15px] font-semibold text-white shadow-sm transition-all duration-200 md:w-auto md:px-8 ${
                  saving ? 'bg-blue-800/80' : 'bg-blue-800 hover:bg-blue-900'
                } disabled:opacity-80`}
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
                    Saving…
                  </>
                ) : (
                  'Save vehicle'
                )}
              </button>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}
