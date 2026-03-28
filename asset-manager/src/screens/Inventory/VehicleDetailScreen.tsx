import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';
import { getVehicleById, deleteVehicleIfNoAssignments } from '../../services/firebase/vehicleService';
import {
  listAssignmentsByVehicle,
  assignFuelToVehicle,
} from '../../services/firebase/vehicleFuelAssignmentService';
import { listItems } from '../../services/firebase/inventoryService';
import type { Vehicle } from '../../types/vehicle';
import type { VehicleFuelAssignment } from '../../types/vehicleFuelAssignment';
import type { Item } from '../../types/inventory';
import {
  selectIsStoreIncharge,
  selectIsAdminOrSuperAdmin,
  selectUserDisplayName,
  selectUserRoleType,
} from '../../store/selectors/authSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSites } from '../../store/slices/sitesSlice';
import { selectAllSites } from '../../store/selectors/sitesSelectors';

type Nav = StackNavigationProp<InventoryStackParamList, 'VehicleDetail'>;
type R = RouteProp<InventoryStackParamList, 'VehicleDetail'>;

export const VehicleDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { vehicleId } = route.params;
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 900;
  const dispatch = useAppDispatch();
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

  const [selectedItemId, setSelectedItemId] = useState<string>('');
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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  useEffect(() => {
    if (fuelItems.length > 0 && !selectedItemId) {
      setSelectedItemId(fuelItems[0].id);
    }
  }, [fuelItems, selectedItemId]);

  useEffect(() => {
    dispatch(fetchSites());
  }, [dispatch]);

  const handleAssign = async () => {
    if (!canManage) return;
    const q = parseFloat(qty);
    if (!selectedItemId || !Number.isFinite(q) || q <= 0) {
      Alert.alert('Check input', 'Select a fuel item and enter a valid quantity (liters).');
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
      Alert.alert('Done', 'Fuel assigned and central stock updated.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = () => {
    if (!canManage || !vehicle) return;
    Alert.alert(
      'Delete vehicle',
      'Only allowed when there is no fuel assignment history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVehicleIfNoAssignments(vehicleId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Cannot delete');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenLayout edges={['top']}>
        <View className="flex-1 items-center justify-center gap-3 px-4" accessibilityLabel="Loading vehicle">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B]">Loading vehicle…</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (!vehicle) {
    return (
      <ScreenLayout edges={['top']}>
        <View className="flex-1 items-center justify-center gap-4 px-4">
          <Text className="text-[17px] font-semibold text-[#0F172A]">Vehicle not found</Text>
          <TouchableOpacity
            className="rounded-[10px] border border-[#1E40AF] px-6 py-3"
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text className="text-[15px] font-semibold text-[#1E40AF]">Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <View className="bg-white border-b border-[#E2E8F0] h-14 px-2 flex-row items-center justify-between">
        <TouchableOpacity
          className="w-12 h-12 items-center justify-center"
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center" numberOfLines={1}>
          {vehicle.vehicleNumber}
        </Text>
        {canManage ? (
          <TouchableOpacity
            className="w-12 h-12 items-center justify-center"
            onPress={() => navigation.navigate('AddEditVehicle', { vehicleId })}
            accessibilityLabel="Edit vehicle"
          >
            <Ionicons name="pencil" size={22} color="#1E40AF" />
          </TouchableOpacity>
        ) : (
          <View className="w-12" />
        )}
      </View>

      {isOverview && (
        <View className="bg-[#475569]/15 px-4 py-2 border-b border-[#E2E8F0]">
          <Text className="text-[13px] text-[#475569]">Read-only overview</Text>
        </View>
      )}

      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="items-center px-4 py-4 pb-10"
      >
        <View
          className={`w-full max-w-5xl gap-3 ${isWideLayout ? 'flex-row items-start' : 'flex-col'}`}
        >
          <View className={`gap-3 ${isWideLayout ? 'flex-1' : 'w-full'}`}>
            <View className="flex-row gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <View className="min-w-0 flex-1">
                <Text className="mb-1 text-[13px] text-[#64748B]">Total assigned</Text>
                <Text className="text-[32px] font-bold text-[#0F172A]">
                  {totalLiters.toLocaleString('en-IN')}
                </Text>
                <Text className="text-[13px] text-[#64748B]">Liters (all time)</Text>
              </View>
              <View className="items-center justify-center pl-1">
                <Ionicons name="car-sport-outline" size={44} color="#B45309" />
              </View>
            </View>

            {vehicle.notes ? (
              <View className="rounded-[10px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <Text className="mb-1 text-[13px] text-[#64748B]">Notes</Text>
                <Text className="text-[15px] text-[#0F172A]">{vehicle.notes}</Text>
              </View>
            ) : null}

            {canManage && fuelItems.length > 0 && (
              <View className="gap-3 rounded-[10px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <Text className="text-[17px] font-semibold text-[#0F172A]">Assign fuel</Text>
                <Text className="text-[13px] text-[#64748B]">
                  Deducts from central store. This cannot be returned from the vehicle.
                </Text>

                <View className="gap-1.5">
                  <Text className="text-[15px] text-[#0F172A]">Fuel item</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                    {fuelItems.map((it) => (
                      <TouchableOpacity
                        key={it.id}
                        onPress={() => setSelectedItemId(it.id)}
                        className={`rounded-lg border px-3 py-2 ${
                          selectedItemId === it.id
                            ? 'border-[#1E40AF] bg-[#1E40AF]'
                            : 'border-[#E2E8F0] bg-white'
                        }`}
                      >
                        <Text
                          className={`text-[13px] font-medium ${
                            selectedItemId === it.id ? 'text-white' : 'text-[#0F172A]'
                          }`}
                          numberOfLines={1}
                        >
                          {it.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View className="gap-1.5">
                  <Text className="text-[15px] text-[#0F172A]">Quantity (L) *</Text>
                  <TextInput
                    className="h-12 rounded-lg border border-[#E2E8F0] bg-white px-4 text-[15px] text-[#0F172A]"
                    keyboardType="decimal-pad"
                    value={qty}
                    onChangeText={setQty}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View className="gap-1.5">
                  <Text className="text-[15px] text-[#0F172A]">Reference site (optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => setSiteId(null)}
                      className={`rounded-lg border px-3 py-2 ${
                        siteId == null ? 'border-[#1E40AF] bg-[#1E40AF]' : 'border-[#E2E8F0] bg-white'
                      }`}
                    >
                      <Text className={`text-[13px] ${siteId == null ? 'text-white' : 'text-[#0F172A]'}`}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {sites.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setSiteId(s.id)}
                        className={`max-w-[220px] rounded-lg border px-3 py-2 ${
                          siteId === s.id ? 'border-[#1E40AF] bg-[#1E40AF]' : 'border-[#E2E8F0] bg-white'
                        }`}
                      >
                        <Text
                          className={`text-[13px] ${siteId === s.id ? 'text-white' : 'text-[#0F172A]'}`}
                          numberOfLines={1}
                        >
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View className="gap-1.5">
                  <Text className="text-[15px] text-[#0F172A]">Reason (optional)</Text>
                  <TextInput
                    className="h-12 rounded-lg border border-[#E2E8F0] bg-white px-4 text-[15px] text-[#0F172A]"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Trip / generator / …"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View className="gap-1.5">
                  <Text className="text-[15px] text-[#0F172A]">Notes (optional)</Text>
                  <TextInput
                    className="min-h-[72px] rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-[15px] text-[#0F172A]"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  className={`h-[50px] flex-row items-center justify-center gap-2 rounded-[10px] px-4 ${
                    submitting ? 'bg-[#1E40AF]/80' : 'bg-[#1E40AF]'
                  }`}
                  onPress={handleAssign}
                  disabled={submitting}
                  accessibilityState={{ disabled: submitting, busy: submitting }}
                  accessibilityLabel={submitting ? 'Assigning fuel, please wait' : 'Assign fuel'}
                >
                  {submitting ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
                    </>
                  ) : (
                    <Text className="text-[15px] font-semibold text-white">Assign fuel</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {canManage && fuelItems.length === 0 && (
              <View className="rounded-[10px] border border-amber-200 bg-amber-50 p-4">
                <Text className="text-[13px] text-amber-900">
                  No active fuel items in inventory. Add a fuel-type item in Central Store first.
                </Text>
              </View>
            )}

            {isWideLayout && canManage && assignments.length === 0 && (
              <TouchableOpacity
                className="mb-2 h-[50px] items-center justify-center rounded-[10px] border border-[#DC2626]"
                onPress={handleDeleteVehicle}
              >
                <Text className="text-[15px] font-semibold text-[#DC2626]">Delete vehicle</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className={`gap-3 ${isWideLayout ? 'flex-1' : 'w-full'}`}>
            <Text className="text-[17px] font-semibold text-[#0F172A]">Consumption history</Text>
            {assignments.length === 0 ? (
              <Text className="text-[15px] text-[#64748B]">No assignments yet.</Text>
            ) : (
              assignments.map((a) => (
                <View key={a.id} className="mb-2 rounded-[10px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
                  <View className="mb-2 flex-row justify-between">
                    <Text className="flex-1 text-[15px] font-semibold text-[#0F172A]" numberOfLines={2}>
                      {a.itemName}
                    </Text>
                    <Text className="text-[15px] font-bold text-[#B45309]">{a.quantityLiters} L</Text>
                  </View>
                  <Text className="text-[13px] text-[#64748B]">
                    {new Date(a.createdAt).toLocaleString()} · {a.assignedByName}
                  </Text>
                  {a.referenceSiteName ? (
                    <Text className="mt-1 text-[13px] text-[#64748B]">Site: {a.referenceSiteName}</Text>
                  ) : null}
                  {a.reason ? (
                    <Text className="mt-1 text-[13px] text-[#0F172A]">Reason: {a.reason}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>

          {!isWideLayout && canManage && assignments.length === 0 && (
            <TouchableOpacity
              className="h-[50px] w-full items-center justify-center rounded-[10px] border border-[#DC2626]"
              onPress={handleDeleteVehicle}
            >
              <Text className="text-[15px] font-semibold text-[#DC2626]">Delete vehicle</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
