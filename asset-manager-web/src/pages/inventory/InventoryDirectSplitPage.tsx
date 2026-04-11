import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
  selectCanViewRequestQueue,
} from '../../store/selectors/authSelectors';
import { selectAssignedSiteIdForUser } from '../../store/selectors/sitesSelectors';
import { selectAllItems, selectInventoryByLocation } from '../../store/selectors/inventorySelectors';
import { setInventoryForLocation } from '../../store/slices/inventorySlice';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import { subscribeInventoryByLocation } from '../../services/firebase/inventoryService';
import { getLocationId } from '../../utils/locationUtils';
import { requestService } from '../../services/firebase/requestService';
import { siteSupervisorService } from '../../services/firebase/siteSupervisorService';
import { listVehicles } from '../../services/firebase/vehicleService';
import {
  dispenseFuelFromMultipleRequestsToVehicle,
} from '../../services/firebase/vehicleFuelAssignmentService';
import type { Request } from '../../types/request';
import type { SiteSupervisor, SupervisorItemAllocation, MultiRequestAllocationInput } from '../../types/siteSupervisor';
import type { Vehicle } from '../../types/vehicle';
import type { InventoryEntry, ItemType } from '../../types/inventory';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EnrichedEntry = {
  entry: InventoryEntry;
  type: ItemType;
  unit: string;
  /** Available = site qty minus already-committed (with supervisors for non-fuel, dispensed for fuel). */
  available: number;
  /** Total currently committed (with supervisors OR dispensed to vehicles). */
  committed: number;
};

type EligibleLine = {
  request: Request;
  /** How many units/liters are still available on this specific request line. */
  available: number;
};

type SuccessSummary = {
  itemName: string;
  recipientLabel: string;
  totalQty: number;
  requestCount: number;
  isFuel: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StepBadge({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${
          active ? 'bg-[#1E40AF] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'
        }`}
      >
        {n}
      </div>
      <h2 className={`text-[17px] font-semibold ${active ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
        {label}
      </h2>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InventoryDirectSplitPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const canViewRequestQueue = useAppSelector(selectCanViewRequestQueue);

  const userId = useAppSelector(selectUserId);
  const userDisplayName = useAppSelector(selectUserDisplayName);
  const siteId = useAppSelector(selectAssignedSiteIdForUser(userId));
  const catalogItems = useAppSelector(selectAllItems);

  const siteLocationId = siteId ? getLocationId('site', siteId) : '';
  const inventoryEntries = useAppSelector(selectInventoryByLocation(siteLocationId));

  const [requests, setRequests] = useState<Request[]>([]);
  const [supervisors, setSupervisors] = useState<SiteSupervisor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [siteAllocations, setSiteAllocations] = useState<SupervisorItemAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // recipient: supervisor (non-fuel) or vehicle (fuel)
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [totalQtyStr, setTotalQtyStr] = useState('');
  const [distributions, setDistributions] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessSummary | null>(null);

  const handleSubscriptionError = useCallback(
    (err: Error) => toast.error(err.message),
    [toast]
  );

  // Fetch subscriptions
  useEffect(() => {
    if (!siteId || !userId) {
      setLoading(false);
      return;
    }

    const unsubReq = requestService.subscribeToRequests(
      { userId, siteId },
      (list) => {
        setRequests(list.filter((r) => r.status === 'transferred' || r.status === 'partially_returned'));
        setLoading(false);
      },
      handleSubscriptionError
    );
    const unsubSup = siteSupervisorService.subscribeSiteSupervisors(
      siteId,
      setSupervisors,
      handleSubscriptionError
    );
    const unsubAlloc = siteSupervisorService.subscribeSiteAllocations(siteId, setSiteAllocations);
    void listVehicles().then(setVehicles).catch(() => setVehicles([]));
    return () => {
      unsubReq();
      unsubSup();
      unsubAlloc();
    };
  }, [siteId, userId, handleSubscriptionError]);

  // Subscribe to site inventory
  useEffect(() => {
    if (!siteId) return;
    const locationId = getLocationId('site', siteId);
    return subscribeInventoryByLocation(locationId, (inv) => {
      dispatch(setInventoryForLocation({ locationId, inventory: inv }));
    });
  }, [siteId, dispatch]);

  // Ensure catalog is loaded
  useEffect(() => {
    if (catalogItems.length === 0) dispatch(fetchItems(undefined));
  }, [dispatch, catalogItems.length]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  /**
   * "Open" non-fuel allocations per itemId (qty still with supervisors).
   * Used to compute "committed" for consumable/non_consumable items.
   */
  const openAllocByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const alloc of siteAllocations) {
      const out = alloc.quantityAllocated - alloc.quantityReturnedToManager;
      if (out > 0) map.set(alloc.itemId, (map.get(alloc.itemId) ?? 0) + out);
    }
    return map;
  }, [siteAllocations]);

  /**
   * "Dispensed" fuel per itemId (qty already sent to vehicles via supervisorOutstandingQty).
   * We derive this from the loaded request lines rather than making a separate Firestore query —
   * supervisorOutstandingQty on each fuel request line is the running total of liters dispensed.
   *
   * Real-world analogy: imagine each request line is a "fuel card" with a credit limit. When you
   * dispense liters to a vehicle, that card's "used" counter ticks up. Summing all fuel cards for
   * the same fuel type gives you total liters already committed.
   */
  const dispensedFuelByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      for (const line of r.items ?? []) {
        if (line.itemType !== 'fuel') continue;
        const dispensed = Number(line.supervisorOutstandingQty ?? 0);
        if (dispensed > 0) {
          map.set(line.itemId, (map.get(line.itemId) ?? 0) + dispensed);
        }
      }
    }
    return map;
  }, [requests]);

  /** All site inventory items enriched with type, unit, and availability. Includes fuel items. */
  const enrichedInventory = useMemo((): EnrichedEntry[] => {
    return inventoryEntries
      .filter((e) => e.quantity > 0)
      .flatMap((entry) => {
        const catalogItem = catalogItems.find((i) => i.id === entry.itemId);
        const type = (entry.itemType ?? catalogItem?.type ?? 'consumable') as ItemType;
        const isFuel = type === 'fuel';
        const committed = isFuel
          ? (dispensedFuelByItem.get(entry.itemId) ?? 0)
          : (openAllocByItem.get(entry.itemId) ?? 0);
        const available = Math.max(0, entry.quantity - committed);
        return [
          {
            entry,
            type,
            unit: entry.unit ?? catalogItem?.unit ?? (isFuel ? 'L' : 'unit'),
            available,
            committed,
          },
        ];
      });
  }, [inventoryEntries, catalogItems, openAllocByItem, dispensedFuelByItem]);

  const selectedEntry = useMemo(
    () => enrichedInventory.find((e) => e.entry.itemId === selectedItemId) ?? null,
    [enrichedInventory, selectedItemId]
  );

  const isFuelItem = selectedEntry?.type === 'fuel';

  const selectedSupervisor = useMemo(
    () => supervisors.find((s) => s.id === selectedSupervisorId) ?? null,
    [supervisors, selectedSupervisorId]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  const totalQty = parseFloat(totalQtyStr) || 0;

  /**
   * Requests that have this item with available qty.
   * - For fuel: filter by itemType === 'fuel'; availability uses supervisorOutstandingQty.
   * - For non-fuel: filter by consumable/non_consumable; same calc.
   * Sorted oldest-first (FIFO) so Auto-fill naturally drains older requests first.
   */
  const eligibleLines = useMemo((): EligibleLine[] => {
    if (!selectedItemId) return [];
    return requests
      .flatMap((r) => {
        const line = r.items?.find(
          (i) => i.itemId === selectedItemId && i.itemType === selectedEntry?.type
        );
        if (!line) return [];
        const available =
          Number(line.quantityApproved ?? 0) -
          Number(line.quantityReturned ?? 0) -
          Number(line.supervisorOutstandingQty ?? 0);
        if (available <= 0) return [];
        return [{ request: r, available }];
      })
      .sort((a, b) => a.request.requestNumber.localeCompare(b.request.requestNumber));
  }, [requests, selectedItemId, selectedEntry]);

  const totalEligibleQty = useMemo(
    () => eligibleLines.reduce((sum, l) => sum + l.available, 0),
    [eligibleLines]
  );

  const distributionTotal = useMemo(
    () => Object.values(distributions).reduce((sum, v) => sum + (parseFloat(v) || 0), 0),
    [distributions]
  );

  const isDistributionComplete =
    distributionTotal > 0 &&
    Math.abs(distributionTotal - totalQty) < 0.001;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectItem = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setSelectedSupervisorId(null);
    setSelectedVehicleId(null);
    setTotalQtyStr('');
    setDistributions({});
    setSuccess(null);
  }, []);

  const handleAutoFill = useCallback(() => {
    if (totalQty < 0.001) return;
    const newDist: Record<string, string> = {};
    let remaining = totalQty;
    for (const { request, available } of eligibleLines) {
      if (remaining <= 0.001) break;
      const take = Math.min(remaining, available);
      newDist[request.id] = isFuelItem ? String(+take.toFixed(2)) : String(Math.floor(take));
      remaining -= take;
    }
    setDistributions(newDist);
  }, [totalQty, eligibleLines, isFuelItem]);

  const handleDistributionChange = useCallback((requestId: string, value: string) => {
    setDistributions((prev) => ({ ...prev, [requestId]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!siteId || !userId || !selectedEntry) return;

    if (isFuelItem) {
      if (!selectedVehicle) {
        toast.info('Select a vehicle before saving.');
        return;
      }
    } else {
      if (!selectedSupervisor) {
        toast.info('Select a supervisor before saving.');
        return;
      }
    }

    if (!isDistributionComplete) {
      toast.info(`Distribute all ${totalQty} ${isFuelItem ? 'L' : 'units'} across requests before saving.`);
      return;
    }

    const activeDists = eligibleLines
      .map((l) => ({
        requestId: l.request.id,
        qty: parseFloat(distributions[l.request.id] ?? '0') || 0,
      }))
      .filter((d) => d.qty > 0);

    setSubmitting(true);
    try {
      if (isFuelItem && selectedVehicle) {
        await dispenseFuelFromMultipleRequestsToVehicle(
          {
            siteId,
            itemId: selectedEntry.entry.itemId,
            vehicleId: selectedVehicle.id,
            distributions: activeDists.map((d) => ({
              requestId: d.requestId,
              quantityLiters: d.qty,
            })),
          },
          { userId, userName: userDisplayName?.trim() || 'Site manager' }
        );
        setSuccess({
          itemName: selectedEntry.entry.itemName,
          recipientLabel: selectedVehicle.vehicleNumber,
          totalQty,
          requestCount: activeDists.length,
          isFuel: true,
        });
        toast.success(`Dispensed ${totalQty} L to ${selectedVehicle.vehicleNumber}.`);
        setSelectedVehicleId(null);
      } else if (!isFuelItem && selectedSupervisor) {
        const multiInput: MultiRequestAllocationInput = {
          siteId,
          itemId: selectedEntry.entry.itemId,
          itemName: selectedEntry.entry.itemName,
          itemType: selectedEntry.type as 'consumable' | 'non_consumable',
          supervisorId: selectedSupervisor.id,
          supervisorName: selectedSupervisor.name,
          distributions: activeDists.map((d) => ({
            requestId: d.requestId,
            quantity: d.qty,
          })),
        };
        await siteSupervisorService.createMultiRequestSupervisorAllocation(multiInput, {
          userId,
          userName: userDisplayName?.trim() || 'Site manager',
        });
        setSuccess({
          itemName: selectedEntry.entry.itemName,
          recipientLabel: selectedSupervisor.name,
          totalQty,
          requestCount: activeDists.length,
          isFuel: false,
        });
        toast.success(`Allocated ${totalQty} to ${selectedSupervisor.name}.`);
        setSelectedSupervisorId(null);
      }

      setSelectedItemId(null);
      setTotalQtyStr('');
      setDistributions({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSubmitting(false);
    }
  }, [
    siteId,
    userId,
    selectedEntry,
    isFuelItem,
    selectedVehicle,
    selectedSupervisor,
    isDistributionComplete,
    totalQty,
    eligibleLines,
    distributions,
    toast,
    userDisplayName,
  ]);

  // ---------------------------------------------------------------------------
  // No-site guard
  // ---------------------------------------------------------------------------

  if (!siteId) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-4 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-6 w-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-[#0F172A]">Split from inventory</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F1F5F9]">
            <Icon name="map-pin" className="h-9 w-9 text-[#94A3B8]" />
          </div>
          <h2 className="mb-2 text-[22px] font-semibold text-[#0F172A]">No working site</h2>
          <p className="max-w-md text-[15px] text-[#64748B]">Select your active site from Inventory first.</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Labels that change based on item type
  const step2Label = isFuelItem ? 'Vehicle' : 'Supervisor';
  const step3Label = isFuelItem ? 'Total liters to dispense' : 'Total quantity to give';
  const unitLabel = isFuelItem ? 'L' : selectedEntry?.unit ?? 'units';

  const recipientId = isFuelItem ? selectedVehicleId : selectedSupervisorId;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-4 pb-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-100"
          aria-label="Go back"
        >
          <Icon name="arrow-left" className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-[22px] font-semibold text-[#0F172A]">Split from inventory</h1>
          <p className="text-[13px] text-[#64748B]">
            {isFuelItem
              ? 'Pick a fuel item, vehicle, then distribute liters across requests'
              : 'Pick an item, supervisor, then distribute across requests'}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center" role="status" aria-busy>
          <LoadingSpinner size="lg" />
          <p className="mt-3 text-[13px] text-[#64748B]">Loading…</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-8">
          {/* Info banner */}
          <div className="mb-4 flex gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <Icon name="exclamation-circle" className="mt-0.5 h-5 w-5 shrink-0 text-[#475569]" />
            <p className="text-[13px] leading-5 text-[#64748B]">
              Start from your total site stock. For consumables and non-consumables the quantity goes
              to a supervisor; for fuel items it goes directly to a vehicle. Quantity is always deducted
              from specific request lines — request pages reflect these automatically.
            </p>
          </div>

          {/* Success banner */}
          {success && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 rounded-[10px] border border-[#16A34A]/30 bg-[#16A34A]/15 p-4"
            >
              <div className="flex items-start gap-2">
                <Icon name="check-circle" className="mt-0.5 h-5 w-5 shrink-0 text-[#16A34A]" />
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-[#0F172A]">
                    {success.isFuel ? 'Fuel dispensed' : 'Allocation saved'}
                  </p>
                  <p className="mt-1 text-[13px] text-[#64748B]">
                    <span className="font-medium text-[#0F172A]">
                      {success.totalQty}
                      {success.isFuel ? ' L' : ''}
                    </span>
                    {' × '}
                    {success.itemName}
                    {' → '}
                    <span className="font-medium text-[#0F172A]">{success.recipientLabel}</span>
                    {success.requestCount > 1 && ` (split across ${success.requestCount} requests)`}
                  </p>
                  <p className="mt-2 text-[13px] text-[#64748B]">
                    Select another item below to continue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccess(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#16A34A]/10"
                  aria-label="Dismiss"
                >
                  <Icon name="x-mark" className="h-4 w-4 text-[#16A34A]" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Step 1: Pick item */}
          {/* ---------------------------------------------------------------- */}
          <StepBadge n={1} label="Site inventory item" active />
          {enrichedInventory.length === 0 ? (
            <div className="mb-8 flex flex-col items-center rounded-[10px] border border-[#E2E8F0] bg-white p-8">
              <Icon name="cube" className="h-12 w-12 text-[#94A3B8]" />
              <p className="mt-3 text-center text-[15px] leading-6 text-[#64748B]">
                No items in site inventory yet.
              </p>
            </div>
          ) : (
            <ul className="mb-8 space-y-2">
              {enrichedInventory.map(({ entry, type, unit, available, committed }) => {
                const isFuel = type === 'fuel';
                const committedLabel = isFuel ? 'With vehicles' : 'With supervisors';
                const typeLabel =
                  type === 'non_consumable'
                    ? 'Non-consumable'
                    : type === 'fuel'
                      ? 'Fuel'
                      : 'Consumable';
                return (
                  <li key={entry.itemId}>
                    <button
                      type="button"
                      onClick={() => handleSelectItem(entry.itemId)}
                      className={`w-full rounded-[10px] border p-4 text-left transition-colors ${
                        selectedItemId === entry.itemId
                          ? 'border-[#1E40AF] bg-[#EFF6FF]'
                          : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="text-[15px] font-semibold text-[#0F172A]">
                          {entry.itemName}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium ${
                            available > 0
                              ? 'bg-[#16A34A]/15 text-[#16A34A]'
                              : 'bg-[#DC2626]/15 text-[#DC2626]'
                          }`}
                        >
                          {available > 0 ? `${available} ${unit} available` : 'None left'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-6 text-[13px] text-[#64748B]">
                        <span>
                          At site:{' '}
                          <span className="font-medium text-[#0F172A]">
                            {entry.quantity} {unit}
                          </span>
                        </span>
                        <span>
                          {committedLabel}:{' '}
                          <span className="font-medium text-[#0F172A]">
                            {committed}
                            {isFuel ? ' L' : ''}
                          </span>
                        </span>
                        <span className="capitalize text-[#475569]">{typeLabel}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Step 2: Pick supervisor (non-fuel) OR vehicle (fuel) */}
          {/* ---------------------------------------------------------------- */}
          <StepBadge n={2} label={step2Label} active={Boolean(selectedItemId)} />
          {!selectedItemId ? (
            <p className="mb-8 text-[13px] text-[#94A3B8]">Select an item above first.</p>
          ) : isFuelItem ? (
            /* Vehicle picker */
            vehicles.length === 0 ? (
              <div className="mb-8 rounded-[10px] border border-[#E2E8F0] bg-white p-5">
                <p className="mb-1 text-center text-[15px] font-medium text-[#0F172A]">
                  Add vehicles first
                </p>
                <p className="mb-4 text-center text-[13px] text-[#64748B]">
                  Register at least one vehicle before dispensing fuel.
                </p>
                <Link
                  to="/inventory/vehicles/new"
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] border-2 border-[#B45309] text-[15px] font-semibold text-[#B45309] hover:bg-[#B45309]/10"
                >
                  <Icon name="truck" className="h-5 w-5" />
                  Add vehicle
                </Link>
              </div>
            ) : (
              <ul className="mb-8 space-y-2">
                {vehicles.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`flex w-full items-center gap-3 rounded-[10px] border p-4 text-left transition-colors ${
                        selectedVehicleId === v.id
                          ? 'border-[#B45309] bg-[#B45309]/10'
                          : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B45309]/15">
                        <Icon name="truck" className="h-5 w-5 text-[#B45309]" />
                      </div>
                      <span className="flex-1 text-[15px] font-semibold text-[#0F172A]">
                        {v.vehicleNumber}
                      </span>
                      {selectedVehicleId === v.id && (
                        <Icon name="check-circle" className="h-6 w-6 shrink-0 text-[#B45309]" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            /* Supervisor picker */
            supervisors.length === 0 ? (
              <div className="mb-8 rounded-[10px] border border-[#E2E8F0] bg-white p-5">
                <p className="mb-1 text-center text-[15px] font-medium text-[#0F172A]">
                  Add people to your team first
                </p>
                <p className="mb-4 text-center text-[13px] text-[#64748B]">
                  You need at least one supervisor before splitting stock.
                </p>
                <Link
                  to="/inventory/site-supervisors"
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] border-2 border-[#B45309] text-[15px] font-semibold text-[#B45309] hover:bg-[#B45309]/10"
                >
                  <Icon name="users" className="h-5 w-5" />
                  Open team list
                </Link>
              </div>
            ) : (
              <ul className="mb-8 space-y-2">
                {supervisors.map((s) => {
                  const initial = (s.name.trim()[0] ?? '?').toUpperCase();
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedSupervisorId(s.id)}
                        disabled={!selectedItemId}
                        className={`flex w-full items-center gap-3 rounded-[10px] border p-4 text-left transition-colors ${
                          selectedSupervisorId === s.id
                            ? 'border-[#B45309] bg-[#B45309]/10'
                            : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                        } disabled:opacity-40`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B45309]/15 text-[15px] font-bold text-[#B45309]">
                          {initial}
                        </div>
                        <span className="flex-1 text-[15px] font-semibold text-[#0F172A]">
                          {s.name}
                        </span>
                        {selectedSupervisorId === s.id && (
                          <Icon name="check-circle" className="h-6 w-6 shrink-0 text-[#B45309]" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Step 3: Enter total quantity */}
          {/* ---------------------------------------------------------------- */}
          <StepBadge
            n={3}
            label={step3Label}
            active={Boolean(selectedItemId && recipientId)}
          />
          {!recipientId ? (
            <p className="mb-8 text-[13px] text-[#94A3B8]">
              {selectedItemId
                ? `Select a ${isFuelItem ? 'vehicle' : 'supervisor'} above first.`
                : 'Select an item first.'}
            </p>
          ) : (
            <div className="mb-8">
              <label className="mb-1.5 block text-[15px] text-[#0F172A]">
                {isFuelItem
                  ? `Liters for ${selectedVehicle?.vehicleNumber}`
                  : `Units for ${selectedSupervisor?.name}`}
              </label>
              <input
                type="number"
                min={isFuelItem ? 0.001 : 1}
                step={isFuelItem ? 'any' : 1}
                inputMode={isFuelItem ? 'decimal' : 'numeric'}
                max={selectedEntry?.available ?? 0}
                value={totalQtyStr}
                onChange={(e) => {
                  setTotalQtyStr(e.target.value);
                  setDistributions({});
                }}
                className="h-12 w-full rounded-lg border border-[#E2E8F0] px-4 text-[15px] text-[#0F172A] focus:border-[#1E40AF] focus:outline-none"
                placeholder={isFuelItem ? '0.0' : '0'}
              />
              {selectedEntry && (
                <p className="mt-1.5 text-[13px] text-[#64748B]">
                  Up to{' '}
                  <span className="font-semibold text-[#0F172A]">
                    {Math.min(selectedEntry.available, totalEligibleQty)} {unitLabel}
                  </span>{' '}
                  available across{' '}
                  <span className="font-semibold text-[#0F172A]">{eligibleLines.length}</span>{' '}
                  transferred request{eligibleLines.length === 1 ? '' : 's'}.
                </p>
              )}
              {totalQty > 0 && totalQty > totalEligibleQty && (
                <p className="mt-1.5 text-[13px] text-[#DC2626]">
                  Only {totalEligibleQty} {unitLabel} can be distributed — reduce the quantity.
                </p>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Step 4: Distribute across requests */}
          {/* ---------------------------------------------------------------- */}
          <StepBadge
            n={4}
            label="Distribute across requests"
            active={Boolean(selectedItemId && recipientId && totalQty > 0)}
          />
          {!(selectedItemId && recipientId && totalQty > 0) ? (
            <p className="mb-8 text-[13px] text-[#94A3B8]">
              Enter a quantity above to see request lines.
            </p>
          ) : eligibleLines.length === 0 ? (
            <div className="mb-8 rounded-[10px] border border-[#E2E8F0] bg-white p-6 text-center">
              <p className="text-[15px] text-[#64748B]">
                No transferred requests have this {isFuelItem ? 'fuel line' : 'item'} with available
                quantity.
              </p>
            </div>
          ) : (
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] text-[#64748B]">
                  Assign total of{' '}
                  <span
                    className={`font-semibold ${
                      isDistributionComplete
                        ? 'text-[#16A34A]'
                        : distributionTotal > totalQty
                          ? 'text-[#DC2626]'
                          : 'text-[#D97706]'
                    }`}
                  >
                    {isFuelItem ? distributionTotal.toFixed(2) : distributionTotal}
                  </span>
                  {' / '}
                  <span className="font-semibold text-[#0F172A]">
                    {isFuelItem ? totalQty.toFixed(2) : totalQty}
                  </span>{' '}
                  {unitLabel}
                </p>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#1E40AF] px-3 text-[13px] font-semibold text-[#1E40AF] hover:bg-[#1E40AF]/5"
                >
                  <Icon name="arrow-path" className="h-4 w-4" />
                  Auto-fill
                </button>
              </div>

              <ul className="space-y-3">
                {eligibleLines.map(({ request, available }) => {
                  const lineQtyStr = distributions[request.id] ?? '';
                  const lineQty = parseFloat(lineQtyStr) || 0;
                  const overCap = lineQty > available + 0.001;
                  return (
                    <li
                      key={request.id}
                      className="rounded-[10px] border border-[#E2E8F0] bg-white p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[15px] font-semibold text-[#0F172A]">
                            {request.requestNumber}
                          </p>
                          <p className="text-[13px] capitalize text-[#64748B]">
                            {request.status.replace('_', ' ')}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#475569]/15 px-2 py-0.5 text-[12px] font-medium text-[#475569]">
                          {available} {unitLabel} available
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label
                          htmlFor={`dist-${request.id}`}
                          className="text-[13px] text-[#64748B]"
                        >
                          Take:
                        </label>
                        <input
                          id={`dist-${request.id}`}
                          type="number"
                          min={0}
                          step={isFuelItem ? 'any' : 1}
                          max={available}
                          value={lineQtyStr}
                          onChange={(e) => handleDistributionChange(request.id, e.target.value)}
                          className={`h-10 w-28 rounded-lg border px-3 text-[15px] text-[#0F172A] focus:outline-none ${
                            overCap
                              ? 'border-[#DC2626] bg-[#DC2626]/5 focus:border-[#DC2626]'
                              : 'border-[#E2E8F0] focus:border-[#1E40AF]'
                          }`}
                          placeholder={isFuelItem ? '0.0' : '0'}
                        />
                        <span className="text-[13px] text-[#94A3B8]">/ {available} {unitLabel}</span>
                        {overCap && (
                          <span className="text-[12px] text-[#DC2626]">exceeds cap</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div
                className={`mt-3 rounded-lg p-3 text-[13px] font-medium ${
                  isDistributionComplete
                    ? 'bg-[#16A34A]/10 text-[#16A34A]'
                    : distributionTotal > totalQty
                      ? 'bg-[#DC2626]/10 text-[#DC2626]'
                      : 'bg-[#D97706]/10 text-[#D97706]'
                }`}
              >
                {isDistributionComplete
                  ? `All ${isFuelItem ? totalQty.toFixed(2) : totalQty} ${unitLabel} distributed — ready to save.`
                  : distributionTotal > totalQty
                    ? `Over by ${(distributionTotal - totalQty).toFixed(isFuelItem ? 2 : 0)} — reduce some quantities.`
                    : `${(totalQty - distributionTotal).toFixed(isFuelItem ? 2 : 0)} more ${unitLabel} to distribute.`}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !isDistributionComplete}
            aria-busy={submitting}
            className="flex min-h-[50px] w-full flex-row items-center justify-center gap-2 rounded-[10px] bg-[#1E40AF] text-[15px] font-semibold text-white hover:bg-[#1E3A8A] disabled:opacity-40"
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" className="border-white/30 border-t-white" />
                <span>Please wait…</span>
              </>
            ) : isFuelItem ? (
              'Dispense fuel'
            ) : (
              'Save allocation'
            )}
          </button>

          {/* Done links */}
          <div className="mt-6 rounded-[10px] border border-[#E2E8F0] bg-white p-4">
            <p className="mb-3 text-[13px] font-medium text-[#64748B]">Done splitting?</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-[#1E40AF] px-4 text-[15px] font-semibold text-[#1E40AF] hover:bg-[#1E40AF]/5"
              >
                Back to inventory
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(canViewRequestQueue ? '/requests/queue' : '/requests/my-requests')
                }
                className="flex min-h-[48px] flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-[#1E40AF] px-4 text-[15px] font-semibold text-[#1E40AF] hover:bg-[#1E40AF]/5"
              >
                Back to requests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
