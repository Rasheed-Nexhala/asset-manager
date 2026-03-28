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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
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
import { siteSupervisorService } from '../../services/firebase/siteSupervisorService';
import type { Request } from '../../types/request';
import type { SiteSupervisor } from '../../types/siteSupervisor';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

type Nav = StackNavigationProp<InventoryStackParamList, 'AllocateItemsToSupervisors'>;

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

export const AllocateItemsToSupervisorsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<InventoryStackParamList, 'AllocateItemsToSupervisors'>>();
  const returnTo = route.params?.returnTo ?? 'inventory';
  const canViewRequestQueue = useAppSelector(selectCanViewRequestQueue);
  const requestsListScreen = canViewRequestQueue ? 'RequestQueue' : 'MyRequests';

  const userId = useAppSelector(selectUserId);
  const userDisplayName = useAppSelector(selectUserDisplayName);
  const siteId = useAppSelector(selectAssignedSiteIdForUser(userId));

  const [requests, setRequests] = useState<Request[]>([]);
  const [supervisors, setSupervisors] = useState<SiteSupervisor[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [qty, setQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!siteId || !userId) {
      setLoading(false);
      return;
    }
    const unsubReq = requestService.subscribeToRequests(
      { userId, siteId },
      (list) => {
        const filtered = list.filter(
          (r) => r.status === 'transferred' || r.status === 'partially_returned'
        );
        setRequests(filtered);
        setLoading(false);
      }
    );
    const unsubSup = siteSupervisorService.subscribeSiteSupervisors(siteId, setSupervisors);
    return () => {
      unsubReq();
      unsubSup();
    };
  }, [siteId, userId]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const allocatableLines = useMemo(() => {
    if (!selectedRequest) return [];
    return (selectedRequest.items ?? []).filter((i) => i.itemType === 'non_consumable');
  }, [selectedRequest]);

  const selectedLine = useMemo(
    () => allocatableLines.find((i) => i.itemId === selectedItemId) ?? null,
    [allocatableLines, selectedItemId]
  );

  const availableForLine = useMemo(() => {
    if (!selectedLine) return 0;
    const maxAtSite =
      selectedLine.quantityApproved - (selectedLine.quantityReturned ?? 0);
    const sup = selectedLine.supervisorOutstandingQty ?? 0;
    return Math.max(0, maxAtSite - sup);
  }, [selectedLine]);

  const selectedSupervisor = useMemo(
    () => supervisors.find((s) => s.id === selectedSupervisorId) ?? null,
    [supervisors, selectedSupervisorId]
  );

  const navigateAfterSave = useCallback(() => {
    // Screen → Inventory stack → bottom tab (same pattern as cross-tab navigation from nested stacks)
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
    if (!siteId || !selectedRequest || !selectedLine || !selectedSupervisor) {
      Alert.alert('Incomplete', 'Choose request, item, supervisor, and quantity.');
      return;
    }
    const q = parseInt(qty, 10);
    if (!Number.isInteger(q) || q < 1) {
      Alert.alert('Invalid quantity', 'Enter a whole number of at least 1.');
      return;
    }
    if (q > availableForLine) {
      Alert.alert('Too many', `Only ${availableForLine} unit(s) can still be assigned for this line.`);
      return;
    }
    setSubmitting(true);
    try {
      await siteSupervisorService.createSupervisorAllocation(
        siteId,
        {
          requestId: selectedRequest.id,
          itemId: selectedLine.itemId,
          supervisorId: selectedSupervisor.id,
          quantity: q,
        },
        selectedSupervisor.name,
        { userId, userName: userDisplayName?.trim() || 'Site manager' }
      );
      setQty('1');
      navigateAfterSave();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not allocate');
    } finally {
      setSubmitting(false);
    }
  }, [
    siteId,
    userId,
    userDisplayName,
    selectedRequest,
    selectedLine,
    selectedSupervisor,
    qty,
    availableForLine,
    navigateAfterSave,
  ]);

  if (!siteId) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Split stock" showBack onBackPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-[#F1F5F9] items-center justify-center mb-4">
            <Ionicons name="location-outline" size={36} color="#94A3B8" />
          </View>
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">No working site</Text>
          <Text className="text-[15px] text-[#64748B] text-center leading-6">
            Select your active site from Inventory first.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Split stock" showBack onBackPress={() => navigation.goBack()} />

      {loading ? (
        <View
          className="flex-1 items-center justify-center px-4"
          accessibilityLabel="Loading requests and supervisors"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[13px] text-[#64748B] mt-3">Loading…</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row gap-2 mb-4 bg-[#F8FAFC] rounded-lg p-3 border border-[#E2E8F0]">
            <Ionicons name="information-circle-outline" size={22} color="#475569" style={{ marginTop: 1 }} />
            <Text className="text-[13px] text-[#64748B] flex-1 leading-5">
              Non-consumables only. Physical stock stays on site; this tracks who holds what until they return it to you.
            </Text>
          </View>

          <StepBadge n={1} label="Transferred request" />
          {requests.length === 0 ? (
            <View className="bg-white rounded-[10px] p-6 border border-[#E2E8F0] items-center mb-8">
              <Ionicons name="cube-outline" size={48} color="#94A3B8" />
              <Text className="text-[15px] text-[#64748B] text-center mt-3 leading-6">
                No transferred requests for this site yet. Complete a transfer from the store first.
              </Text>
            </View>
          ) : (
            <View className="gap-2 mb-8">
              {requests.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => {
                    setSelectedRequestId(r.id);
                    setSelectedItemId(null);
                  }}
                  className={`rounded-[10px] p-4 border flex-row items-center justify-between ${
                    selectedRequestId === r.id
                      ? 'border-[#1E40AF] bg-[#EFF6FF]'
                      : 'border-[#E2E8F0] bg-white'
                  }`}
                  accessibilityRole="button"
                >
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-[#0F172A]">{r.requestNumber}</Text>
                    <Text className="text-[13px] text-[#64748B] capitalize">{r.status.replace('_', ' ')}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={selectedRequestId === r.id ? '#1E40AF' : '#94A3B8'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedRequest && (
            <>
              <StepBadge n={2} label="Line item" />
              <View className="gap-2 mb-8">
                {allocatableLines.length === 0 ? (
                  <Text className="text-[15px] text-[#64748B] text-center py-4">
                    No non-consumable lines on this request.
                  </Text>
                ) : (
                  allocatableLines.map((line) => {
                    const maxAtSite = line.quantityApproved - (line.quantityReturned ?? 0);
                    const sup = line.supervisorOutstandingQty ?? 0;
                    const avail = Math.max(0, maxAtSite - sup);
                    return (
                      <TouchableOpacity
                        key={line.itemId}
                        onPress={() => setSelectedItemId(line.itemId)}
                        className={`rounded-[10px] p-4 border ${
                          selectedItemId === line.itemId
                            ? 'border-[#1E40AF] bg-[#EFF6FF]'
                            : 'border-[#E2E8F0] bg-white'
                        }`}
                      >
                        <View className="flex-row justify-between items-start gap-2 mb-2">
                          <Text className="text-[15px] font-semibold text-[#0F172A] flex-1">{line.itemName}</Text>
                          <View className="px-2 py-0.5 rounded-full bg-[#475569]/15">
                            <Text className="text-[12px] font-medium text-[#475569]">{avail} left</Text>
                          </View>
                        </View>
                        <View className="flex-row gap-6">
                          <View>
                            <Text className="text-[13px] text-[#64748B]">At site</Text>
                            <Text className="text-[15px] text-[#0F172A] font-medium">{maxAtSite}</Text>
                          </View>
                          <View>
                            <Text className="text-[13px] text-[#64748B]">Already split</Text>
                            <Text className="text-[15px] text-[#0F172A] font-medium">{sup}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </>
          )}

          <StepBadge n={3} label="Supervisor" />
          {supervisors.length === 0 ? (
            <View className="bg-white rounded-[10px] p-5 border border-[#E2E8F0] mb-3">
              <Text className="text-[15px] text-[#0F172A] text-center mb-2 font-medium">
                Add people to your team first
              </Text>
              <Text className="text-[13px] text-[#64748B] text-center mb-4">
                You need at least one site supervisor before you can split stock.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SiteSupervisors')}
                className="border-[1.5px] border-[#B45309] rounded-[10px] min-h-[48px] justify-center items-center flex-row gap-2"
              >
                <Ionicons name="people-outline" size={22} color="#B45309" />
                <Text className="text-[15px] font-semibold text-[#B45309]">Open team list</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-2 mb-8">
              {supervisors.map((s) => {
                const initial = (s.name.trim()[0] ?? '?').toUpperCase();
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSelectedSupervisorId(s.id)}
                    className={`rounded-[10px] p-4 border flex-row items-center gap-3 ${
                      selectedSupervisorId === s.id
                        ? 'border-[#B45309] bg-[#B45309]/10'
                        : 'border-[#E2E8F0] bg-white'
                    }`}
                  >
                    <View className="w-10 h-10 rounded-full bg-[#B45309]/15 items-center justify-center">
                      <Text className="text-[15px] font-bold text-[#B45309]">{initial}</Text>
                    </View>
                    <Text className="text-[15px] font-semibold text-[#0F172A] flex-1">{s.name}</Text>
                    {selectedSupervisorId === s.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#B45309" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <StepBadge n={4} label="Quantity" />
          <View className="gap-1.5 mb-2">
            <Text className="text-[15px] text-[#0F172A]">Units for this supervisor</Text>
            <TextInput
              value={qty}
              onChangeText={setQty}
              keyboardType="number-pad"
              className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A]"
              accessibilityLabel="Quantity to allocate"
            />
          </View>
          {selectedLine && (
            <Text className="text-[13px] text-[#64748B] mb-6">
              You can assign up to <Text className="font-semibold text-[#0F172A]">{availableForLine}</Text> more on this line.
            </Text>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || supervisors.length === 0}
            className={`rounded-[10px] min-h-[50px] flex-row items-center justify-center gap-2 px-4 ${
              submitting ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
            } ${supervisors.length === 0 ? 'opacity-40' : ''}`}
            accessibilityLabel={
              submitting ? 'Saving allocation, please wait' : 'Save allocation to supervisor'
            }
            accessibilityState={{
              disabled: submitting || supervisors.length === 0,
              busy: submitting,
            }}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
              </>
            ) : (
              <Text className="text-[15px] font-semibold text-white">Save allocation</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </ScreenLayout>
  );
};
