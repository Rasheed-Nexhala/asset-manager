/**
 * Full-screen picker for assigning which Admin or SuperAdmin will approve a PO.
 * Replaces the bottom-sheet modal on Create PO for clearer hierarchy and touch targets (CIAMS).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CommonActions, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { getAdminUsers } from '../../services/firebase/userRoleService';
import type { UserListItem } from '../../types/roles';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';

type NavigationProp = StackNavigationProp<
  PurchaseOrderStackParamList,
  'SelectApprovalAdmin'
>;
type RouteParams = RouteProp<PurchaseOrderStackParamList, 'SelectApprovalAdmin'>;

function RoleBadge({ role }: { role: UserListItem['role'] }) {
  if (role === 'SuperAdmin') {
    return (
      <View className="px-2 py-1 rounded-full bg-[#4338CA]/15 self-start">
        <Text className="text-[12px] font-medium text-[#4338CA]">Super Admin</Text>
      </View>
    );
  }
  return (
    <View className="px-2 py-1 rounded-full bg-[#1E40AF]/15 self-start">
      <Text className="text-[12px] font-medium text-[#1E40AF]">Admin</Text>
    </View>
  );
}

export const SelectApprovalAdminScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const returnParams = route.params?.returnParams ?? {};
  const selectedAdminId = route.params?.selectedAdminId ?? null;

  const [admins, setAdmins] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAdmins = useCallback(async () => {
    try {
      const list = await getAdminUsers();
      setAdmins(list);
    } catch (e) {
      console.error('Failed to load admins:', e);
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAdmins();
    setRefreshing(false);
  }, [loadAdmins]);

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((u) => {
      const name = (u.displayName ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [admins, searchQuery]);

  const applySelectionAndGoBack = useCallback(
    (item: UserListItem) => {
      const name = item.displayName?.trim() || item.email?.trim() || 'Unknown';
      try {
        const state = navigation.getState?.();
        const routes = state?.routes;
        const previousRoute = routes?.[routes.length - 2];
        if (
          previousRoute?.name === 'CreatePO' &&
          typeof navigation.dispatch === 'function'
        ) {
          navigation.dispatch({
            ...CommonActions.setParams({
              ...returnParams,
              approvalAdminSelection: { id: item.id, name },
            }),
            source: previousRoute.key,
          });
          navigation.goBack();
          return;
        }
      } catch {
        // Fall through
      }
      navigation.navigate('CreatePO', {
        ...returnParams,
        approvalAdminSelection: { id: item.id, name },
      });
    },
    [navigation, returnParams]
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: UserListItem }) => {
      const title = item.displayName?.trim() || item.email?.trim() || 'Unknown';
      const isCurrent = selectedAdminId != null && item.id === selectedAdminId;
      return (
        <TouchableOpacity
          className={`bg-white rounded-[10px] p-4 border mb-3 min-h-[48px] ${
            isCurrent ? 'border-[#1E40AF] bg-[#1E40AF]/5' : 'border-[#E2E8F0]'
          }`}
          onPress={() => applySelectionAndGoBack(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${item.role === 'SuperAdmin' ? 'Super Admin' : 'Admin'}${isCurrent ? ', currently selected' : ''}`}
        >
          <View className="flex-row justify-between items-start gap-3">
            <View className="flex-1 min-w-0">
              <Text className="text-[15px] font-semibold text-[#0F172A]" numberOfLines={2}>
                {title}
              </Text>
              {item.email ? (
                <Text className="text-[13px] text-[#64748B] mt-1" numberOfLines={2}>
                  {item.email}
                </Text>
              ) : null}
            </View>
            <View className="items-end gap-2">
              <RoleBadge role={item.role} />
              {isCurrent ? (
                <Ionicons name="checkmark-circle" size={22} color="#1E40AF" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [applySelectionAndGoBack, selectedAdminId]
  );

  const ListEmptyComponent = useCallback(() => {
    if (loading) return null;
    return (
      <View className="flex-1 items-center justify-center py-16 px-4">
        <Ionicons name="people-outline" size={64} color="#94A3B8" />
        <Text className="text-[22px] font-semibold text-[#0F172A] mt-4 text-center">
          {searchQuery.trim() ? 'No matching admins' : 'No admins available'}
        </Text>
        <Text className="text-[15px] text-[#64748B] mt-2 text-center">
          {searchQuery.trim()
            ? 'Try a different search term.'
            : 'Ensure there are active Admin or Super Admin users in the system.'}
        </Text>
      </View>
    );
  }, [loading, searchQuery]);

  if (loading && admins.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Assign approver" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading admins…</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Assign approver" showBack onBackPress={handleBack} />

      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <Text className="text-[17px] font-semibold text-[#0F172A] mb-1">
          Who should approve this PO?
        </Text>
        <Text className="text-[15px] text-[#64748B] mb-3">
          Only the selected admin can approve this purchase order.
        </Text>
        <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-[#0F172A]"
            placeholder="Search by name or email…"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search admins"
            accessibilityRole="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              className="w-12 h-12 items-center justify-center"
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text className="text-[13px] text-[#64748B] mt-2">
          {filteredAdmins.length} admin{filteredAdmins.length === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList
        data={filteredAdmins}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
          flexGrow: 1,
        }}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1E40AF" />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </ScreenLayout>
  );
};
