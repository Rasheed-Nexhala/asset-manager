import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';
import { listVehicles } from '../../services/firebase/vehicleService';
import type { Vehicle } from '../../types/vehicle';
import {
  selectIsStoreIncharge,
  selectIsAdminOrSuperAdmin,
} from '../../store/selectors/authSelectors';
import { useAppSelector } from '../../store/hooks';
import { getTotalLitersAssignedToVehicle } from '../../services/firebase/vehicleFuelAssignmentService';
import { filterVehiclesBySearch } from '../../utils/vehicleNumberUtils';

type Nav = StackNavigationProp<InventoryStackParamList, 'VehiclesList'>;

export const VehiclesListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const canManage = useAppSelector(selectIsStoreIncharge);
  const isOverview = useAppSelector(selectIsAdminOrSuperAdmin) && !canManage;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVehicles = useMemo(
    () => filterVehiclesBySearch(vehicles, searchQuery),
    [vehicles, searchQuery]
  );

  const load = useCallback(async () => {
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  return (
    <ScreenLayout edges={['top']}>
      <View className="h-14 flex-row items-center justify-between border-b border-[#E2E8F0] bg-white px-2">
        <TouchableOpacity
          className="h-12 w-12 items-center justify-center"
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[22px] font-semibold text-[#0F172A]">
          Vehicles
        </Text>
        {canManage ? (
          <TouchableOpacity
            className="h-12 w-12 items-center justify-center"
            onPress={() => navigation.navigate('AddEditVehicle', {})}
            accessibilityRole="button"
            accessibilityLabel="Add vehicle"
          >
            <Ionicons name="add-circle" size={26} color="#1E40AF" />
          </TouchableOpacity>
        ) : (
          <View className="w-12" />
        )}
      </View>

      {isOverview && (
        <View className="border-b border-[#E2E8F0] bg-[#475569]/15 px-4 py-2">
          <Text className="text-[13px] text-[#475569]">
            Overview only — fuel assignment is managed by Store Incharge.
          </Text>
        </View>
      )}

      {!loading && vehicles.length > 0 && (
        <View className="border-b border-[#E2E8F0] bg-white px-4 py-3">
          <View className="h-12 flex-row items-center rounded-full bg-[#F1F5F9] px-4">
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              className="ml-3 flex-1 text-[15px] text-[#0F172A]"
              placeholder="Search by vehicle number or notes…"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search vehicles"
              accessibilityRole="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className="h-8 w-8 items-center justify-center"
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="mt-4 text-[15px] text-[#64748B]">Loading vehicles…</Text>
        </View>
      ) : (
        <View className="flex-1 items-center bg-[#F8FAFC]">
          <View className="w-full max-w-3xl flex-1">
            <FlatList
              className="flex-1 pt-3"
              contentContainerClassName="px-4 pb-6"
              data={filteredVehicles}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E40AF" />
              }
              ListEmptyComponent={
                vehicles.length === 0 ? (
                  <View className="items-center px-4 py-12">
                    <Ionicons name="car-sport-outline" size={56} color="#94A3B8" />
                    <Text className="mt-4 text-center text-[17px] font-semibold text-[#0F172A]">
                      No vehicles yet
                    </Text>
                    <Text className="mt-2 max-w-md text-center text-[15px] text-[#64748B]">
                      {canManage
                        ? 'Add a vehicle to assign fuel from the central store.'
                        : 'No vehicles registered.'}
                    </Text>
                  </View>
                ) : (
                  <View className="items-center px-4 py-12">
                    <Ionicons name="search" size={56} color="#94A3B8" />
                    <Text className="mt-4 text-center text-[17px] font-semibold text-[#0F172A]">
                      No matching vehicles
                    </Text>
                    <Text className="mt-2 max-w-md text-center text-[15px] text-[#64748B]">
                      Try a different search term or clear the search to see all vehicles.
                    </Text>
                    <TouchableOpacity
                      className="mt-6 rounded-[10px] bg-[#1E40AF] px-4 py-2.5"
                      onPress={() => setSearchQuery('')}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                    >
                      <Text className="text-[15px] font-semibold text-white">Clear search</Text>
                    </TouchableOpacity>
                  </View>
                )
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="mb-3 rounded-[10px] border border-[#E2E8F0] bg-white p-4 shadow-sm"
                  onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Vehicle ${item.vehicleNumber}`}
                >
                  <View className="mb-2 flex-row items-start justify-between">
                    <Text className="flex-1 text-[15px] font-semibold text-[#0F172A]">
                      {item.vehicleNumber}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#64748B" />
                  </View>
                  {item.notes ? (
                    <Text className="mb-2 text-[13px] text-[#64748B]" numberOfLines={2}>
                      {item.notes}
                    </Text>
                  ) : null}
                  <View className="mt-1 flex-row justify-between border-t border-[#E2E8F0] pt-2">
                    <Text className="text-[13px] text-[#64748B]">Total fuel assigned</Text>
                    <Text className="text-[15px] font-semibold text-[#0F172A]">
                      {(totals[item.id] ?? 0).toLocaleString('en-IN')} L
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      )}
    </ScreenLayout>
  );
};
