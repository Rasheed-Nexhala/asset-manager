/**
 * Inventory Update Requests Screen
 *
 * Admin-only screen to view and approve/reject pending inventory update requests
 * from Store Incharge. Lists pending requests with Approve/Reject actions.
 * Shows Active Access section with revoke/restore toggle for approved requests.
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { InventoryUpdateRequestCard } from '../../components/Inventory/InventoryUpdateRequestCard';
import { ActiveAccessCard } from '../../components/Inventory/ActiveAccessCard';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchPendingRequests,
  approveInventoryUpdateRequest,
  rejectInventoryUpdateRequest,
  revokeInventoryUpdateAccess,
  restoreInventoryUpdateAccess,
} from '../../store/thunks/inventoryUpdateRequestThunks';
import {
  selectPendingRequests,
  selectActiveApprovedRequests,
  selectInventoryUpdateRequestLoading,
  selectInventoryUpdateRequestError,
} from '../../store/selectors/inventoryUpdateRequestSelectors';
import { selectIsAdmin } from '../../store/selectors/authSelectors';
import { clearError } from '../../store/slices/inventoryUpdateRequestSlice';
import type { InventoryUpdateRequest } from '../../types/inventoryUpdateRequest';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

type NavigationProp = StackNavigationProp<
  InventoryStackParamList,
  'InventoryUpdateRequests'
>;

export const InventoryUpdateRequestsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [requestToReject, setRequestToReject] =
    useState<InventoryUpdateRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const pendingRequests = useAppSelector(selectPendingRequests);
  const activeApprovedRequests = useAppSelector(selectActiveApprovedRequests);
  const activeAccessRequests = useMemo(
    () => activeApprovedRequests.filter((r) => !r.accessRevoked),
    [activeApprovedRequests]
  );
  const inactiveAccessRequests = useMemo(
    () => activeApprovedRequests.filter((r) => r.accessRevoked),
    [activeApprovedRequests]
  );
  const isLoading = useAppSelector(selectInventoryUpdateRequestLoading);
  const error = useAppSelector(selectInventoryUpdateRequestError);
  const isAdmin = useAppSelector(selectIsAdmin);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        dispatch(fetchPendingRequests());
      }
    }, [dispatch, isAdmin])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchPendingRequests());
    setTimeout(() => setRefreshing(false), 800);
  }, [dispatch]);

  const handleApprove = useCallback(
    async (requestId: string) => {
      setApprovingId(requestId);
      try {
        await dispatch(
          approveInventoryUpdateRequest({ requestId, expiresInHours: 24 })
        ).unwrap();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to approve request';
        Alert.alert('Error', msg);
      } finally {
        setApprovingId(null);
      }
    },
    [dispatch]
  );

  const handleRejectPress = useCallback((request: InventoryUpdateRequest) => {
    setRequestToReject(request);
    setRejectionReason('');
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!requestToReject) return;
    const reason = rejectionReason.trim() || 'Rejected by Admin';
    setRejectingId(requestToReject.id);
    try {
      await dispatch(
        rejectInventoryUpdateRequest({
          requestId: requestToReject.id,
          rejectionReason: reason,
        })
      ).unwrap();
      setRequestToReject(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to reject request';
      Alert.alert('Error', msg);
    } finally {
      setRejectingId(null);
    }
  }, [dispatch, requestToReject, rejectionReason]);

  const handleRejectCancel = useCallback(() => {
    setRequestToReject(null);
    setRejectionReason('');
  }, []);

  const handleAccessToggle = useCallback(
    async (requestId: string, revoke: boolean) => {
      setTogglingId(requestId);
      try {
        if (revoke) {
          await dispatch(revokeInventoryUpdateAccess(requestId)).unwrap();
        } else {
          await dispatch(restoreInventoryUpdateAccess(requestId)).unwrap();
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to update access';
        Alert.alert('Error', msg);
      } finally {
        setTogglingId(null);
      }
    },
    [dispatch]
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  if (!isAdmin) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Inventory Update Requests"
          showBack
          onBackPress={handleBack}
        />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="lock-closed" size={48} color="#94A3B8" />
          <Text className="text-[17px] font-semibold text-[#0F172A] mt-4 text-center">
            Admin Only
          </Text>
          <Text className="text-[15px] text-[#64748B] mt-2 text-center">
            This screen is only available to Admin users.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Inventory Update Requests"
        showBack
        onBackPress={handleBack}
      />

      {error && (
        <View className="bg-[#DC2626]/15 px-4 py-3 mx-4 mt-4 rounded-lg flex-row items-center gap-3">
          <Ionicons name="alert-circle" size={24} color="#DC2626" />
          <Text className="text-[15px] text-[#DC2626] flex-1">{error}</Text>
          <TouchableOpacity
            onPress={() => dispatch(clearError())}
            accessibilityLabel="Dismiss error"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}

      {isLoading && pendingRequests.length === 0 && activeApprovedRequests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading requests...
          </Text>
        </View>
      ) : pendingRequests.length === 0 && activeApprovedRequests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="document-text-outline" size={80} color="#94A3B8" />
          <Text className="text-[22px] font-semibold text-[#0F172A] mt-4 text-center">
            No pending requests
          </Text>
          <Text className="text-[15px] text-[#64748B] mt-2 text-center">
            All inventory update requests have been processed.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1E40AF"
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Active Access section - access granted, can revoke */}
          {activeAccessRequests.length > 0 && (
            <View className="px-4 pt-4">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                Active Access
              </Text>
              <Text className="text-[13px] text-[#64748B] mb-3">
                Toggle off to revoke access.
              </Text>
              <View className="gap-3">
                {activeAccessRequests.map((req) => (
                  <ActiveAccessCard
                    key={req.id}
                    request={req}
                    onToggle={handleAccessToggle}
                    isToggling={togglingId === req.id}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Inactive Requests section - revoked, can restore */}
          {inactiveAccessRequests.length > 0 && (
            <View className="px-4 pt-6">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                Inactive Requests
              </Text>
              <Text className="text-[13px] text-[#64748B] mb-3">
                Toggle on to restore access.
              </Text>
              <View className="gap-3">
                {inactiveAccessRequests.map((req) => (
                  <ActiveAccessCard
                    key={req.id}
                    request={req}
                    onToggle={handleAccessToggle}
                    isToggling={togglingId === req.id}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Pending Requests section */}
          {pendingRequests.length > 0 && (
            <View className="px-4 pt-6 pb-4">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                Pending Requests
              </Text>
              <View className="gap-3">
                {pendingRequests.map((item) => (
                  <InventoryUpdateRequestCard
                    key={item.id}
                    request={item}
                    onApprove={() => handleApprove(item.id)}
                    onReject={() => handleRejectPress(item)}
                    isApproving={approvingId === item.id}
                    isRejecting={rejectingId === item.id}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Reject Reason Modal - cross-platform (Alert.prompt is iOS-only) */}
      <Modal
        visible={!!requestToReject}
        transparent
        animationType="fade"
        onRequestClose={handleRejectCancel}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-[10px] p-4">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-2">
              Reject Request
            </Text>
            <Text className="text-[15px] text-[#64748B] mb-3">
              Enter a reason for rejection (required):
            </Text>
            <TextInput
              className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] mb-4"
              placeholder="e.g. Please verify stock count first"
              placeholderTextColor="#94A3B8"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              editable={!rejectingId}
              accessibilityLabel="Rejection reason"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                onPress={handleRejectCancel}
                disabled={!!rejectingId}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text className="text-[15px] font-semibold text-[#1E40AF]">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#DC2626] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
                onPress={handleRejectSubmit}
                disabled={!!rejectingId}
                accessibilityLabel="Reject"
                accessibilityRole="button"
              >
                {rejectingId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                )}
                <Text className="text-[15px] font-semibold text-white">
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
};
