import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
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
import { dispenseFuelFromMultipleRequestsToVehicle } from '../../services/firebase/vehicleFuelAssignmentService';
import type { Request } from '../../types/request';
import type {
  SiteSupervisor,
  SupervisorItemAllocation,
  MultiRequestAllocationInput,
} from '../../types/siteSupervisor';
import type { Vehicle } from '../../types/vehicle';
import type { InventoryEntry, ItemType } from '../../types/inventory';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------

type Nav = StackNavigationProp<InventoryStackParamList, 'InventoryDirectSplit'>;
type R = RouteProp<InventoryStackParamList, 'InventoryDirectSplit'>;

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type EnrichedEntry = {
  entry: InventoryEntry;
  type: ItemType;
  unit: string;
  /** Available = site qty minus already-committed (with supervisors for non-fuel, dispensed for fuel). */
  available: number;
  /** Total currently committed. */
  committed: number;
};

type EligibleLine = {
  request: Request;
  available: number;
};

// ---------------------------------------------------------------------------
// Step badge
// ---------------------------------------------------------------------------

function StepBadge({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <View className="flex-row items-center gap-2 mb-3">
      <View
        className={`w-8 h-8 rounded-full items-center justify-center ${
          active ? 'bg-[#1E40AF]' : 'bg-[#E2E8F0]'
        }`}
      >
        <Text className={`text-[14px] font-bold ${active ? 'text-white' : 'text-[#94A3B8]'}`}>
          {n}
        </Text>
      </View>
      <Text
        className={`text-[17px] font-semibold flex-1 ${active ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export const InventoryDirectSplitScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const returnTo = route.params?.returnTo ?? 'inventory';
  const dispatch = useAppDispatch();

  const userId = useAppSelector(selectUserId);
  const userDisplayName = useAppSelector(selectUserDisplayName);
  const siteId = useAppSelector(selectAssignedSiteIdForUser(userId));
  const catalogItems = useAppSelector(selectAllItems);
  const canViewRequestQueue = useAppSelector(selectCanViewRequestQueue);
  const requestsScreen = canViewRequestQueue ? 'RequestQueue' : 'MyRequests';

  const siteLocationId = siteId ? getLocationId('site', siteId) : '';
  const inventoryEntries = useAppSelector(selectInventoryByLocation(siteLocationId));

  const [requests, setRequests] = useState<Request[]>([]);
  const [supervisors, setSupervisors] = useState<SiteSupervisor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [siteAllocations, setSiteAllocations] = useState<SupervisorItemAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [totalQtyStr, setTotalQtyStr] = useState('');
  const [distributions, setDistributions] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Data subscriptions
  // ---------------------------------------------------------------------------

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
      }
    );
    const unsubSup = siteSupervisorService.subscribeSiteSupervisors(siteId, (list) => setSupervisors(list));
    const unsubAlloc = siteSupervisorService.subscribeSiteAllocations(siteId, setSiteAllocations);
    void listVehicles().then(setVehicles).catch(() => setVehicles([]));
    return () => {
      unsubReq();
      unsubSup();
      unsubAlloc();
    };
  }, [siteId, userId]);

  useEffect(() => {
    if (!siteId) return;
    const locationId = getLocationId('site', siteId);
    return subscribeInventoryByLocation(locationId, (inv) => {
      dispatch(setInventoryForLocation({ locationId, inventory: inv }));
    });
  }, [siteId, dispatch]);

  useEffect(() => {
    if (catalogItems.length === 0) dispatch(fetchItems());
  }, [dispatch, catalogItems.length]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  /** Open non-fuel allocations per itemId (qty still with supervisors). */
  const openAllocByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const alloc of siteAllocations) {
      const out = alloc.quantityAllocated - alloc.quantityReturnedToManager;
      if (out > 0) map.set(alloc.itemId, (map.get(alloc.itemId) ?? 0) + out);
    }
    return map;
  }, [siteAllocations]);

  /**
   * Fuel dispensed per itemId, derived from supervisorOutstandingQty on request lines.
   * Each fuel request line's supervisorOutstandingQty = total liters already dispensed to vehicles.
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

  /** All site inventory entries, including fuel items. */
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

  const eligibleLines = useMemo((): EligibleLine[] => {
    if (!selectedItemId || !selectedEntry) return [];
    return requests
      .flatMap((r) => {
        const line = r.items?.find(
          (i) => i.itemId === selectedItemId && i.itemType === selectedEntry.type
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
    distributionTotal > 0 && Math.abs(distributionTotal - totalQty) < 0.001;

  const recipientId = isFuelItem ? selectedVehicleId : selectedSupervisorId;
  const unitLabel = isFuelItem ? 'L' : (selectedEntry?.unit ?? 'units');

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectItem = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setSelectedSupervisorId(null);
    setSelectedVehicleId(null);
    setTotalQtyStr('');
    setDistributions({});
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

  const navigateAfterSubmit = useCallback(() => {
    if (returnTo === 'requests') {
      const stackNav = navigation.getParent();
      const tabNav = stackNav?.getParent();
      if (tabNav) {
        (tabNav as { navigate: (name: string, params?: object) => void }).navigate('Requests', {
          screen: requestsScreen,
        });
        return;
      }
    }
    navigation.navigate('MySiteInventory');
  }, [navigation, returnTo, requestsScreen]);

  const handleSubmit = useCallback(async () => {
    if (!siteId || !userId || !selectedEntry) return;
    if (!isDistributionComplete) return;

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
      } else if (!isFuelItem && selectedSupervisor) {
        const multiInput: MultiRequestAllocationInput = {
          siteId,
          itemId: selectedEntry.entry.itemId,
          itemName: selectedEntry.entry.itemName,
          itemType: selectedEntry.type as 'consumable' | 'non_consumable',
          supervisorId: selectedSupervisor.id,
          supervisorName: selectedSupervisor.name,
          distributions: activeDists.map((d) => ({ requestId: d.requestId, quantity: d.qty })),
        };
        await siteSupervisorService.createMultiRequestSupervisorAllocation(multiInput, {
          userId,
          userName: userDisplayName?.trim() || 'Site manager',
        });
      }
      navigateAfterSubmit();
    } catch (e) {
      console.error(e instanceof Error ? e.message : 'Could not save');
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
    eligibleLines,
    distributions,
    userDisplayName,
    navigateAfterSubmit,
  ]);

  // ---------------------------------------------------------------------------
  // Loading guard
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Split from inventory" showBack onBackPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="mt-4 text-[15px] text-[#64748B]">Loading…</Text>
        </View>
      </ScreenLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const step2Label = isFuelItem ? 'Vehicle' : 'Supervisor';
  const step3Label = isFuelItem ? 'Total liters to dispense' : 'Total quantity to give';

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Split from inventory"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-4 pt-4">
          {/* Info banner */}
          <View className="flex-row gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 mb-4">
            <Ionicons name="information-circle-outline" size={20} color="#475569" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-[13px] leading-5 text-[#64748B]">
              Pick an item from site stock. Consumables and non-consumables go to a supervisor;
              fuel goes directly to a vehicle. Quantity is deducted from the specific request lines
              you choose — request pages update automatically.
            </Text>
          </View>

          {/* ---------------------------------------------------------------- */}
          {/* Step 1: Item */}
          {/* ---------------------------------------------------------------- */}
          <StepBadge n={1} label="Site inventory item" active />
          {enrichedInventory.length === 0 ? (
            <View className="mb-8 items-center rounded-[10px] border border-[#E2E8F0] bg-white p-8">
              <Ionicons name="cube-outline" size={48} color="#94A3B8" />
              <Text className="mt-3 text-center text-[15px] text-[#64748B]">
                No items in site inventory yet.
              </Text>
            </View>
          ) : (
            <View className="mb-8 gap-2">
              {enrichedInventory.map(({ entry, type, unit, available, committed }) => {
                const isFuel = type === 'fuel';
                const committedLabel = isFuel ? 'With vehicles' : 'With sups';
                const typeLabel =
                  type === 'non_consumable' ? 'Non-cons.' : type === 'fuel' ? 'Fuel' : 'Consumable';
                return (
                  <TouchableOpacity
                    key={entry.itemId}
                    onPress={() => handleSelectItem(entry.itemId)}
                    className={`rounded-[10px] border p-4 ${
                      selectedItemId === entry.itemId
                        ? 'border-[#1E40AF] bg-[#EFF6FF]'
                        : 'border-[#E2E8F0] bg-white'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${entry.itemName}`}
                  >
                    <View className="flex-row justify-between items-start mb-2 gap-2">
                      <Text className="text-[15px] font-semibold text-[#0F172A] flex-1">
                        {entry.itemName}
                      </Text>
                      <View
                        className={`rounded-full px-2 py-0.5 ${
                          available > 0 ? 'bg-[#16A34A]/15' : 'bg-[#DC2626]/15'
                        }`}
                      >
                        <Text
                          className={`text-[12px] font-medium ${
                            available > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }`}
                        >
                          {available > 0 ? `${available} ${unit} avail.` : 'None left'}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row flex-wrap gap-4">
                      <Text className="text-[13px] text-[#64748B]">
                        At site:{' '}
                        <Text className="font-medium text-[#0F172A]">
                          {entry.quantity} {unit}
                        </Text>
                      </Text>
                      <Text className="text-[13px] text-[#64748B]">
                        {committedLabel}:{' '}
                        <Text className="font-medium text-[#0F172A]">
                          {committed}
                          {isFuel ? ' L' : ''}
                        </Text>
                      </Text>
                      <Text className="text-[13px] text-[#475569]">{typeLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Step 2: Supervisor (non-fuel) OR Vehicle (fuel) */}
          {/* ---------------------------------------------------------------- */}
          <StepBadge n={2} label={step2Label} active={Boolean(selectedItemId)} />
          {!selectedItemId ? (
            <Text className="mb-8 text-[13px] text-[#94A3B8]">Select an item above first.</Text>
          ) : isFuelItem ? (
            vehicles.length === 0 ? (
              <View className="mb-8 rounded-[10px] border border-[#E2E8F0] bg-white p-5">
                <Text className="text-center text-[15px] font-medium text-[#0F172A] mb-1">
                  Add vehicles first
                </Text>
                <Text className="text-center text-[13px] text-[#64748B] mb-3">
                  Register at least one vehicle before dispensing fuel.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AddEditVehicle')}
                  className="min-h-[48px] items-center justify-center rounded-[10px] border-2 border-[#B45309]"
                  accessibilityRole="button"
                >
                  <Text className="text-[15px] font-semibold text-[#B45309]">Add vehicle</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="mb-8 gap-2">
                {vehicles.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setSelectedVehicleId(v.id)}
                    className={`flex-row items-center gap-3 rounded-[10px] border p-4 ${
                      selectedVehicleId === v.id
                        ? 'border-[#B45309] bg-[#B45309]/10'
                        : 'border-[#E2E8F0] bg-white'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Select vehicle ${v.vehicleNumber}`}
                  >
                    <View className="w-10 h-10 rounded-full bg-[#B45309]/15 items-center justify-center shrink-0">
                      <Ionicons name="car-outline" size={20} color="#B45309" />
                    </View>
                    <Text className="flex-1 text-[15px] font-semibold text-[#0F172A]">
                      {v.vehicleNumber}
                    </Text>
                    {selectedVehicleId === v.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#B45309" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )
          ) : (
            supervisors.length === 0 ? (
              <View className="mb-8 rounded-[10px] border border-[#E2E8F0] bg-white p-5">
                <Text className="text-center text-[15px] font-medium text-[#0F172A] mb-1">
                  Add supervisors first
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SiteSupervisors')}
                  className="min-h-[48px] items-center justify-center rounded-[10px] border-2 border-[#B45309] mt-3"
                  accessibilityRole="button"
                >
                  <Text className="text-[15px] font-semibold text-[#B45309]">Open team list</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="mb-8 gap-2">
                {supervisors.map((s) => {
                  const initial = (s.name.trim()[0] ?? '?').toUpperCase();
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedSupervisorId(s.id)}
                      disabled={!selectedItemId}
                      className={`flex-row items-center gap-3 rounded-[10px] border p-4 ${
                        selectedSupervisorId === s.id
                          ? 'border-[#B45309] bg-[#B45309]/10'
                          : 'border-[#E2E8F0] bg-white'
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel={`Select supervisor ${s.name}`}
                    >
                      <View className="w-10 h-10 rounded-full bg-[#B45309]/15 items-center justify-center shrink-0">
                        <Text className="text-[15px] font-bold text-[#B45309]">{initial}</Text>
                      </View>
                      <Text className="flex-1 text-[15px] font-semibold text-[#0F172A]">{s.name}</Text>
                      {selectedSupervisorId === s.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#B45309" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Step 3: Total qty */}
          {/* ---------------------------------------------------------------- */}
          <StepBadge
            n={3}
            label={step3Label}
            active={Boolean(selectedItemId && recipientId)}
          />
          {!recipientId ? (
            <Text className="mb-8 text-[13px] text-[#94A3B8]">
              {selectedItemId
                ? `Select a ${isFuelItem ? 'vehicle' : 'supervisor'} above first.`
                : 'Select an item first.'}
            </Text>
          ) : (
            <View className="mb-8">
              <Text className="text-[15px] text-[#0F172A] mb-1.5">
                {isFuelItem
                  ? `Liters for ${selectedVehicle?.vehicleNumber}`
                  : `Units for ${selectedSupervisor?.name}`}
              </Text>
              <TextInput
                className="h-12 rounded-lg border border-[#E2E8F0] px-4 text-[15px] text-[#0F172A] bg-white"
                keyboardType={isFuelItem ? 'decimal-pad' : 'numeric'}
                value={totalQtyStr}
                onChangeText={(v) => {
                  setTotalQtyStr(v);
                  setDistributions({});
                }}
                placeholder={isFuelItem ? '0.0' : '0'}
                placeholderTextColor="#94A3B8"
                accessibilityLabel={isFuelItem ? 'Total liters' : 'Total quantity'}
              />
              {selectedEntry && (
                <Text className="mt-1.5 text-[13px] text-[#64748B]">
                  Up to{' '}
                  <Text className="font-semibold text-[#0F172A]">
                    {Math.min(selectedEntry.available, totalEligibleQty)} {unitLabel}
                  </Text>{' '}
                  across{' '}
                  <Text className="font-semibold text-[#0F172A]">{eligibleLines.length}</Text>{' '}
                  request{eligibleLines.length === 1 ? '' : 's'}.
                </Text>
              )}
              {totalQty > 0 && totalQty > totalEligibleQty && (
                <Text className="mt-1.5 text-[13px] text-[#DC2626]">
                  Only {totalEligibleQty} {unitLabel} available — reduce the quantity.
                </Text>
              )}
            </View>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Step 4: Distribute */}
          {/* ---------------------------------------------------------------- */}
          <StepBadge
            n={4}
            label="Distribute across requests"
            active={Boolean(selectedItemId && recipientId && totalQty > 0)}
          />
          {!(selectedItemId && recipientId && totalQty > 0) ? (
            <Text className="mb-8 text-[13px] text-[#94A3B8]">
              Enter a quantity above to see request lines.
            </Text>
          ) : eligibleLines.length === 0 ? (
            <View className="mb-8 rounded-[10px] border border-[#E2E8F0] bg-white p-6 items-center">
              <Text className="text-[15px] text-[#64748B] text-center">
                No transferred requests have this {isFuelItem ? 'fuel line' : 'item'} with available quantity.
              </Text>
            </View>
          ) : (
            <View className="mb-8">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[13px] text-[#64748B]">
                  Distributed:{' '}
                  <Text
                    className={`font-semibold ${
                      isDistributionComplete
                        ? 'text-[#16A34A]'
                        : distributionTotal > totalQty
                          ? 'text-[#DC2626]'
                          : 'text-[#D97706]'
                    }`}
                  >
                    {isFuelItem ? distributionTotal.toFixed(2) : distributionTotal}
                  </Text>
                  {' / '}
                  <Text className="font-semibold text-[#0F172A]">
                    {isFuelItem ? totalQty.toFixed(2) : totalQty}
                  </Text>{' '}
                  {unitLabel}
                </Text>
                <TouchableOpacity
                  onPress={handleAutoFill}
                  className="flex-row items-center gap-1.5 rounded-lg border border-[#1E40AF] px-3 py-2 min-h-[36px]"
                  accessibilityRole="button"
                  accessibilityLabel="Auto-fill distribution"
                >
                  <Ionicons name="refresh" size={14} color="#1E40AF" />
                  <Text className="text-[13px] font-semibold text-[#1E40AF]">Auto-fill</Text>
                </TouchableOpacity>
              </View>

              <View className="gap-3">
                {eligibleLines.map(({ request, available }) => {
                  const lineQtyStr = distributions[request.id] ?? '';
                  const lineQty = parseFloat(lineQtyStr) || 0;
                  const overCap = lineQty > available + 0.001;
                  return (
                    <View
                      key={request.id}
                      className="rounded-[10px] border border-[#E2E8F0] bg-white p-4"
                    >
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-1">
                          <Text className="text-[15px] font-semibold text-[#0F172A]">
                            {request.requestNumber}
                          </Text>
                          <Text className="text-[13px] text-[#64748B] capitalize">
                            {request.status.replace('_', ' ')}
                          </Text>
                        </View>
                        <View className="rounded-full bg-[#475569]/15 px-2 py-0.5">
                          <Text className="text-[12px] font-medium text-[#475569]">
                            {available} {unitLabel} avail.
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-[13px] text-[#64748B]">Take:</Text>
                        <TextInput
                          className={`h-10 w-24 rounded-lg border px-3 text-[15px] text-[#0F172A] bg-white ${
                            overCap ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                          }`}
                          keyboardType={isFuelItem ? 'decimal-pad' : 'numeric'}
                          value={lineQtyStr}
                          onChangeText={(v) => handleDistributionChange(request.id, v)}
                          placeholder={isFuelItem ? '0.0' : '0'}
                          placeholderTextColor="#94A3B8"
                          accessibilityLabel={`Quantity from ${request.requestNumber}`}
                        />
                        <Text className="text-[13px] text-[#94A3B8]">/ {available} {unitLabel}</Text>
                        {overCap && (
                          <Text className="text-[12px] text-[#DC2626]">over cap</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Status */}
              <View
                className={`mt-3 rounded-lg p-3 ${
                  isDistributionComplete
                    ? 'bg-[#16A34A]/10'
                    : distributionTotal > totalQty
                      ? 'bg-[#DC2626]/10'
                      : 'bg-[#D97706]/10'
                }`}
              >
                <Text
                  className={`text-[13px] font-medium ${
                    isDistributionComplete
                      ? 'text-[#16A34A]'
                      : distributionTotal > totalQty
                        ? 'text-[#DC2626]'
                        : 'text-[#D97706]'
                  }`}
                >
                  {isDistributionComplete
                    ? `All ${isFuelItem ? totalQty.toFixed(2) : totalQty} ${unitLabel} distributed — ready to save.`
                    : distributionTotal > totalQty
                      ? `Over by ${(distributionTotal - totalQty).toFixed(isFuelItem ? 2 : 0)} — reduce some quantities.`
                      : `${(totalQty - distributionTotal).toFixed(isFuelItem ? 2 : 0)} more ${unitLabel} to distribute.`}
                </Text>
              </View>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !isDistributionComplete}
            className={`min-h-[50px] rounded-[10px] items-center justify-center flex-row gap-2 ${
              submitting || !isDistributionComplete ? 'bg-[#1E40AF]/40' : 'bg-[#1E40AF]'
            }`}
            accessibilityRole="button"
            accessibilityLabel={isFuelItem ? 'Dispense fuel' : 'Save allocation'}
            accessibilityState={{ busy: submitting, disabled: !isDistributionComplete }}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
              </>
            ) : (
              <Text className="text-[15px] font-semibold text-white">
                {isFuelItem ? 'Dispense fuel' : 'Save allocation'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Done links */}
          <View className="mt-6 rounded-[10px] border border-[#E2E8F0] bg-white p-4">
            <Text className="text-[13px] font-medium text-[#64748B] mb-3">Done splitting?</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => navigation.navigate('MySiteInventory')}
                className="flex-1 min-h-[48px] items-center justify-center rounded-[10px] border-[1.5px] border-[#1E40AF]"
                accessibilityRole="button"
              >
                <Text className="text-[15px] font-semibold text-[#1E40AF]">Inventory</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const stackNav = navigation.getParent();
                  const tabNav = stackNav?.getParent();
                  if (tabNav) {
                    (tabNav as { navigate: (name: string, params?: object) => void }).navigate('Requests', {
                      screen: requestsScreen,
                    });
                  } else {
                    navigation.goBack();
                  }
                }}
                className="flex-1 min-h-[48px] items-center justify-center rounded-[10px] border-[1.5px] border-[#1E40AF]"
                accessibilityRole="button"
              >
                <Text className="text-[15px] font-semibold text-[#1E40AF]">Requests</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
