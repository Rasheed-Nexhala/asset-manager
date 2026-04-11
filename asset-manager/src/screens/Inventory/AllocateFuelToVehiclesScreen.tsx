import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppSelector } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
  selectCanViewRequestQueue,
} from '../../store/selectors/authSelectors';
import { selectAssignedSiteIdForUser } from '../../store/selectors/sitesSelectors';
import { requestService } from '../../services/firebase/requestService';
import { listVehicles } from '../../services/firebase/vehicleService';
import { dispenseFuelFromSiteRequestToVehicle } from '../../services/firebase/vehicleFuelAssignmentService';
import type { Request } from '../../types/request';
import type { Vehicle } from '../../types/vehicle';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

type Nav = StackNavigationProp<InventoryStackParamList, 'AllocateFuelToVehicles'>;
type R = RouteProp<InventoryStackParamList, 'AllocateFuelToVehicles'>;

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-3">
      <View className="w-8 h-8 rounded-full bg-[#1E40AF] items-center justify-center">
        <Text className="text-[14px] font-bold text-white">{n}</Text>
      </View>
      <Text className="text-[17px] font-semibold text-[#0F172A] flex-1">{label}</Text>
    </View>
  );
}

export const AllocateFuelToVehiclesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const returnTo = route.params?.returnTo ?? 'inventory';
  const canViewRequestQueue = useAppSelector(selectCanViewRequestQueue);
  const requestsListScreen = canViewRequestQueue ? 'RequestQueue' : 'MyRequests';

  const userId = useAppSelector(selectUserId);
  const userDisplayName = useAppSelector(selectUserDisplayName);
  const siteId = useAppSelector(selectAssignedSiteIdForUser(userId));

  const [requests, setRequests] = useState<Request[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!siteId || !userId) {
      setLoading(false);
      return;
    }
    const unsub = requestService.subscribeToRequests({ userId, siteId }, (list) => {
      setRequests(
        list.filter((r) => r.status === 'transferred' || r.status === 'partially_returned')
      );
      setLoading(false);
    });
    void listVehicles()
      .then(setVehicles)
      .catch(() => setVehicles([]));
    return () => unsub();
  }, [siteId, userId]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const fuelLines = useMemo(() => {
    if (!selectedRequest) return [];
    return (selectedRequest.items ?? []).filter((i) => i.itemType === 'fuel');
  }, [selectedRequest]);

  const selectedLine = useMemo(
    () => fuelLines.find((i) => i.itemId === selectedItemId) ?? null,
    [fuelLines, selectedItemId]
  );

  const availableForLine = useMemo(() => {
    if (!selectedLine) return 0;
    const maxAtSite = selectedLine.quantityApproved - (selectedLine.quantityReturned ?? 0);
    const dispensed = selectedLine.supervisorOutstandingQty ?? 0;
    return Math.max(0, maxAtSite - dispensed);
  }, [selectedLine]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  const navigateDone = useCallback(() => {
    const stackNav = navigation.getParent();
    const tabNav = stackNav?.getParent();
    if (!tabNav) {
      navigation.goBack();
      return;
    }
    if (returnTo === 'requests') {
      tabNav.navigate('Requests', { screen: requestsListScreen });
    } else {
      tabNav.navigate('Inventory', { screen: 'MySiteInventory' });
    }
  }, [navigation, returnTo, requestsListScreen]);

  const handleSubmit = useCallback(async () => {
    if (!siteId || !userId || !selectedRequest || !selectedLine || !selectedVehicle) {
      Alert.alert('Incomplete', 'Choose request, fuel line, vehicle, and quantity (liters).');
      return;
    }
    const q = parseFloat(qty);
    if (!Number.isFinite(q) || q <= 0) {
      Alert.alert('Invalid', 'Enter a valid quantity in liters.');
      return;
    }
    if (q > availableForLine) {
      Alert.alert('Too much', `Only ${availableForLine} L can still be dispensed on this line.`);
      return;
    }
    setSubmitting(true);
    try {
      await dispenseFuelFromSiteRequestToVehicle(
        {
          siteId,
          requestId: selectedRequest.id,
          itemId: selectedLine.itemId,
          vehicleId: selectedVehicle.id,
          quantityLiters: q,
        },
        { userId, userName: userDisplayName?.trim() || 'Site manager' }
      );
      Alert.alert('Done', `Dispensed ${q} L to ${selectedVehicle.vehicleNumber}.`);
      setQty('');
      setSelectedVehicleId(null);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not dispense fuel');
    } finally {
      setSubmitting(false);
    }
  }, [
    siteId,
    userId,
    selectedRequest,
    selectedLine,
    selectedVehicle,
    qty,
    availableForLine,
    userDisplayName,
  ]);

  if (!siteId) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Dispense fuel" showBack onBackPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[15px] text-[#64748B] text-center">No working site assigned.</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Dispense fuel" showBack onBackPress={() => navigation.goBack()} />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pb-8" keyboardShouldPersistTaps="handled">
          <Text className="text-[13px] text-[#64748B] mb-4">
            Fuel lines from transferred requests only. Does not deduct the central store.
          </Text>

          <StepBadge n={1} label="Transferred request" />
          {requests.length === 0 ? (
            <Text className="text-[15px] text-[#64748B] mb-6">No transferred requests.</Text>
          ) : (
            requests.map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => {
                  setSelectedRequestId(r.id);
                  setSelectedItemId(null);
                }}
                className={`mb-2 rounded-[10px] border p-4 ${
                  selectedRequestId === r.id ? 'border-[#1E40AF] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <Text className="text-[15px] font-semibold text-[#0F172A]">{r.requestNumber}</Text>
              </TouchableOpacity>
            ))
          )}

          {selectedRequest && (
            <>
              <StepBadge n={2} label="Fuel line" />
              {fuelLines.length === 0 ? (
                <Text className="text-[15px] text-[#64748B] mb-6">No fuel on this request.</Text>
              ) : (
                fuelLines.map((line) => {
                  const maxAtSite = line.quantityApproved - (line.quantityReturned ?? 0);
                  const dispensed = line.supervisorOutstandingQty ?? 0;
                  const avail = Math.max(0, maxAtSite - dispensed);
                  return (
                    <TouchableOpacity
                      key={line.itemId}
                      onPress={() => setSelectedItemId(line.itemId)}
                      className={`mb-2 rounded-[10px] border p-4 ${
                        selectedItemId === line.itemId
                          ? 'border-[#1E40AF] bg-[#EFF6FF]'
                          : 'border-[#E2E8F0] bg-white'
                      }`}
                    >
                      <Text className="text-[15px] font-semibold text-[#0F172A]">{line.itemName}</Text>
                      <Text className="text-[13px] text-[#64748B]">
                        {avail} L left · {dispensed} L dispensed
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </>
          )}

          <StepBadge n={3} label="Vehicle" />
          {vehicles.length === 0 ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('AddEditVehicle', {})}
              className="mb-6 rounded-[10px] border-2 border-[#1E40AF] p-4 items-center"
            >
              <Text className="text-[15px] font-semibold text-[#1E40AF]">Add vehicle</Text>
            </TouchableOpacity>
          ) : (
            vehicles.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => setSelectedVehicleId(v.id)}
                className={`mb-2 rounded-[10px] border p-4 ${
                  selectedVehicleId === v.id ? 'border-[#B45309] bg-[#B45309]/10' : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <Text className="text-[15px] font-semibold text-[#0F172A]">{v.vehicleNumber}</Text>
              </TouchableOpacity>
            ))
          )}

          <StepBadge n={4} label="Liters" />
          <TextInput
            value={qty}
            onChangeText={setQty}
            keyboardType="decimal-pad"
            placeholder="e.g. 50"
            className="border border-[#E2E8F0] rounded-lg h-12 px-4 mb-2 bg-white text-[#0F172A]"
          />
          {selectedLine ? (
            <Text className="text-[13px] text-[#64748B] mb-4">
              Max {availableForLine} L more on this line.
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || vehicles.length === 0}
            className={`rounded-[10px] min-h-[50px] items-center justify-center mb-6 ${
              submitting ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-[15px] font-semibold text-white">Dispense fuel</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={navigateDone}
            className="rounded-[10px] border-2 border-[#1E40AF] min-h-[48px] items-center justify-center mb-4"
          >
            <Text className="text-[15px] font-semibold text-[#1E40AF]">Done</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </ScreenLayout>
  );
};
