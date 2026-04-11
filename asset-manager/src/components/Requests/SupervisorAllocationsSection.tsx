import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store/hooks';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import { siteSupervisorService } from '../../services/firebase/siteSupervisorService';
import type { SupervisorItemAllocation } from '../../types/siteSupervisor';
import type { RequestItem } from '../../types/request';

type Props = {
  siteId: string;
  requestId: string;
  requestItems?: RequestItem[];
  /** Tab navigator (parent of the Requests stack). */
  tabNavigation: {
    navigate: (
      name: string,
      params?: { screen?: string; params?: { returnTo?: 'inventory' | 'requests' } }
    ) => void;
  };
};

function lineItemType(
  row: SupervisorItemAllocation,
  requestItems?: RequestItem[]
): RequestItem['itemType'] | undefined {
  return row.itemType ?? requestItems?.find((i) => i.itemId === row.itemId)?.itemType;
}

export const SupervisorAllocationsSection: React.FC<Props> = ({
  siteId,
  requestId,
  requestItems,
  tabNavigation,
}) => {
  const userId = useAppSelector(selectUserId);
  const userDisplayName = useAppSelector(selectUserDisplayName);
  const [rows, setRows] = useState<SupervisorItemAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAlloc, setModalAlloc] = useState<SupervisorItemAllocation | null>(null);
  const [returnQty, setReturnQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = siteSupervisorService.subscribeRequestAllocations(
      siteId,
      requestId,
      (list) => {
        setRows(list);
        setLoading(false);
      }
    );
    return unsub;
  }, [siteId, requestId]);

  const maxReturnForModal = modalAlloc
    ? modalAlloc.quantityAllocated - modalAlloc.quantityReturnedToManager
    : 0;

  const handleRecordReturn = useCallback(async () => {
    if (!modalAlloc) return;
    const q = parseInt(returnQty, 10);
    if (!Number.isInteger(q) || q < 1) {
      Alert.alert('Invalid quantity', 'Enter a whole number of at least 1.');
      return;
    }
    if (q > maxReturnForModal) {
      Alert.alert('Too many', `At most ${maxReturnForModal} can be returned for this line.`);
      return;
    }
    setSubmitting(true);
    try {
      await siteSupervisorService.recordReturnFromSupervisor(siteId, modalAlloc.id, q, {
        userId: userId ?? '',
        userName: userDisplayName?.trim() || 'Site manager',
      });
      setModalAlloc(null);
      setReturnQty('1');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not record return');
    } finally {
      setSubmitting(false);
    }
  }, [modalAlloc, returnQty, siteId, maxReturnForModal, userId, userDisplayName]);

  if (loading) {
    return (
      <View className="bg-[#F8FAFC] rounded-[10px] p-4 border border-[#E2E8F0]">
        <View
          className="bg-white rounded-[10px] p-6 border border-[#E2E8F0] items-center justify-center min-h-[120px]"
          accessibilityLabel="Loading supervisor splits"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="small" color="#1E40AF" />
          <Text className="text-[13px] text-[#64748B] mt-2">Loading splits…</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View className="bg-[#F8FAFC] rounded-[10px] p-3 border border-[#E2E8F0]">
        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
          <View className="flex-row items-start justify-between gap-2 mb-2">
            <View className="flex-row items-center gap-2 flex-1 flex-wrap">
              <View className="px-2 py-1 rounded-full bg-[#B45309]/15">
                <Text className="text-[12px] font-medium text-[#B45309]">Site team</Text>
              </View>
              <Text className="text-[17px] font-semibold text-[#0F172A]">Who has materials</Text>
            </View>
          </View>

          <View className="flex-row gap-2 mb-4 bg-[#F8FAFC] rounded-lg p-3 border border-[#E2E8F0]">
            <Ionicons name="information-circle-outline" size={20} color="#64748B" style={{ marginTop: 2 }} />
            <Text className="text-[13px] text-[#64748B] flex-1 leading-5">
              Only non-consumables can be recorded as returned from a supervisor; consumables and fuel are issued and
              are not returned through this screen. Store Incharge returns non-consumables to central store.
            </Text>
          </View>

          {rows.length === 0 ? (
            <View className="items-center py-6 px-2">
              <View className="w-16 h-16 rounded-full bg-[#F1F5F9] items-center justify-center mb-3">
                <Ionicons name="git-network-outline" size={36} color="#94A3B8" />
              </View>
              <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
                No splits on this request
              </Text>
              <Text className="text-[15px] text-[#64748B] text-center mb-5">
                Add people under Team list, then use Split stock to assign quantities from transferred lines.
              </Text>
              <View className="gap-2 w-full">
                <TouchableOpacity
                  onPress={() =>
                    tabNavigation.navigate('Inventory', { screen: 'SiteSupervisors' })
                  }
                  className="border-[1.5px] border-[#B45309] rounded-[10px] min-h-[48px] justify-center items-center px-2"
                  accessibilityRole="button"
                  accessibilityLabel="Open team list"
                >
                  <Text className="text-[15px] font-semibold text-[#B45309]">Team list</Text>
                </TouchableOpacity>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() =>
                      tabNavigation.navigate('Inventory', {
                        screen: 'AllocateItemsToSupervisors',
                        params: { returnTo: 'requests' },
                      })
                    }
                    className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] min-h-[48px] justify-center items-center px-2"
                    accessibilityRole="button"
                    accessibilityLabel="Split via request"
                  >
                    <Text className="text-[15px] font-semibold text-[#1E40AF]">Split via request</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      tabNavigation.navigate('Inventory', {
                        screen: 'InventoryDirectSplit',
                        params: { returnTo: 'requests' },
                      })
                    }
                    className="flex-1 border-[1.5px] border-[#475569] rounded-[10px] min-h-[48px] justify-center items-center px-2"
                    accessibilityRole="button"
                    accessibilityLabel="Split from site inventory"
                  >
                    <Text className="text-[15px] font-semibold text-[#475569]">Split from stock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {rows.map((row) => {
                const out = row.quantityAllocated - row.quantityReturnedToManager;
                const withSup = out > 0;
                const lt = lineItemType(row, requestItems);
                const isIssuedOnly = lt === 'consumable' || lt === 'fuel';
                const canRecordReturn = withSup && lt === 'non_consumable';
                const statusLabel = !withSup
                  ? 'All back'
                  : isIssuedOnly
                    ? 'Issued'
                    : `${out} out`;
                return (
                  <View
                    key={row.id}
                    className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]"
                  >
                    <View className="flex-row justify-between items-start gap-2 mb-3">
                      <Text
                        className="text-[15px] font-semibold text-[#0F172A] flex-1"
                        numberOfLines={2}
                      >
                        {row.itemName}
                      </Text>
                      <View
                        className={`px-2 py-1 rounded-full ${withSup ? 'bg-[#D97706]/15' : 'bg-[#16A34A]/15'}`}
                      >
                        <Text
                          className={`text-[12px] font-medium ${withSup ? 'text-[#D97706]' : 'text-[#16A34A]'}`}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row flex-wrap gap-4 mb-3 pb-3 border-b border-[#E2E8F0]">
                      <View className="flex-1 min-w-[100px]">
                        <Text className="text-[13px] text-[#64748B] mb-0.5">Supervisor</Text>
                        <Text className="text-[15px] font-medium text-[#0F172A]" numberOfLines={1}>
                          {row.supervisorName}
                        </Text>
                      </View>
                      <View className="flex-1 min-w-[100px]">
                        <Text className="text-[13px] text-[#64748B] mb-0.5">Allocated / returned</Text>
                        <Text className="text-[15px] text-[#0F172A]">
                          {row.quantityAllocated} / {row.quantityReturnedToManager}
                        </Text>
                      </View>
                      {row.requestNumber ? (
                        <View>
                          <Text className="text-[13px] text-[#64748B] mb-0.5">From request</Text>
                          <View className="rounded-full bg-[#1E40AF]/10 px-2 py-0.5 self-start">
                            <Text className="text-[12px] font-medium text-[#1E40AF]">
                              {row.requestNumber}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                    {canRecordReturn && (
                      <TouchableOpacity
                        onPress={() => {
                          setModalAlloc(row);
                          setReturnQty(String(Math.min(out, 1)));
                        }}
                        className="border-[1.5px] border-[#B45309] rounded-[10px] min-h-[48px] px-4 justify-center items-center flex-row gap-2"
                        accessibilityRole="button"
                        accessibilityLabel={`Record return from ${row.supervisorName} for ${row.itemName}`}
                      >
                        <Ionicons name="arrow-undo-circle-outline" size={22} color="#B45309" />
                        <Text className="text-[15px] font-semibold text-[#B45309]">
                          Record return from supervisor
                        </Text>
                      </TouchableOpacity>
                    )}
                    {withSup && isIssuedOnly ? (
                      <Text className="text-center text-[13px] text-[#64748B]">
                        This line type is not returned from supervisors — only non-consumables use return here.
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {rows.length > 0 && (
            <View className="gap-2 mt-4 pt-4 border-t border-[#E2E8F0]">
              <TouchableOpacity
                onPress={() =>
                  tabNavigation.navigate('Inventory', { screen: 'SiteSupervisors' })
                }
                className="border-[1.5px] border-[#B45309] rounded-[10px] min-h-[48px] px-2 justify-center items-center"
                accessibilityRole="button"
                accessibilityLabel="Manage supervisors list"
              >
                <Text className="text-[15px] font-semibold text-[#B45309] text-center">Team list</Text>
              </TouchableOpacity>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() =>
                    tabNavigation.navigate('Inventory', {
                      screen: 'AllocateItemsToSupervisors',
                      params: { returnTo: 'requests' },
                    })
                  }
                  className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] min-h-[48px] px-2 justify-center items-center"
                  accessibilityRole="button"
                  accessibilityLabel="Split via request"
                >
                  <Text className="text-[15px] font-semibold text-[#1E40AF] text-center">Split via request</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    tabNavigation.navigate('Inventory', {
                      screen: 'InventoryDirectSplit',
                      params: { returnTo: 'requests' },
                    })
                  }
                  className="flex-1 border-[1.5px] border-[#475569] rounded-[10px] min-h-[48px] px-2 justify-center items-center"
                  accessibilityRole="button"
                  accessibilityLabel="Split from site inventory"
                >
                  <Text className="text-[15px] font-semibold text-[#475569] text-center">Split from stock</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      <Modal visible={modalAlloc !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
            <View className="w-12 h-12 rounded-full bg-[#B45309]/15 self-center items-center justify-center mb-3">
              <Ionicons name="arrow-undo-outline" size={26} color="#B45309" />
            </View>
            <Text className="text-[17px] font-semibold text-[#0F172A] text-center mb-1">
              Return from supervisor
            </Text>
            <Text className="text-[13px] text-[#64748B] text-center mb-1">
              How many units did <Text className="text-[#0F172A] font-medium">{modalAlloc?.supervisorName}</Text> hand back to you?
            </Text>
            <Text className="text-[12px] text-[#64748B] text-center mb-4">
              Max {maxReturnForModal} for this line
            </Text>
            <TextInput
              value={returnQty}
              onChangeText={setReturnQty}
              keyboardType="number-pad"
              className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] mb-4"
              accessibilityLabel="Quantity returned from supervisor"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setModalAlloc(null)}
                className="flex-1 border-[1.5px] border-[#64748B] rounded-[10px] h-[48px] justify-center items-center"
              >
                <Text className="text-[15px] font-semibold text-[#64748B]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRecordReturn}
                disabled={submitting}
                className={`flex-1 rounded-[10px] h-[48px] flex-row items-center justify-center gap-2 ${
                  submitting ? 'bg-[#B45309]/70' : 'bg-[#B45309]'
                }`}
                accessibilityLabel={submitting ? 'Recording return, please wait' : 'Confirm return from supervisor'}
                accessibilityState={{ disabled: submitting, busy: submitting }}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
                  </>
                ) : (
                  <Text className="text-[15px] font-semibold text-white">Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
