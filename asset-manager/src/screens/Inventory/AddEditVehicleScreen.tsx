import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';
import {
  createVehicle,
  updateVehicle,
  getVehicleById,
  countAssignmentsForVehicle,
} from '../../services/firebase/vehicleService';
import { useAppSelector } from '../../store/hooks';
import { selectIsStoreIncharge } from '../../store/selectors/authSelectors';

type Nav = StackNavigationProp<InventoryStackParamList, 'AddEditVehicle'>;
type R = RouteProp<InventoryStackParamList, 'AddEditVehicle'>;

export const AddEditVehicleScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const vehicleId = route.params?.vehicleId;
  const isEdit = Boolean(vehicleId);
  const canManage = useAppSelector(selectIsStoreIncharge);

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const vehicleNumberLocked = isEdit && assignmentCount > 0;

  useEffect(() => {
    if (!canManage) {
      Alert.alert('Read-only', 'Only Store Incharge can edit vehicles.');
      navigation.goBack();
    }
  }, [canManage, navigation]);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    (async () => {
      try {
        const [v, count] = await Promise.all([
          getVehicleById(vehicleId),
          countAssignmentsForVehicle(vehicleId),
        ]);
        if (cancelled || !v) return;
        setVehicleNumber(v.vehicleNumber);
        setNotes(v.notes ?? '');
        setAssignmentCount(count);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const handleSave = useCallback(async () => {
    const num = vehicleNumber.trim();
    if (!num) {
      Alert.alert('Required', 'Vehicle number is required.');
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
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [vehicleNumber, notes, isEdit, vehicleId, vehicleNumberLocked, navigation]);

  if (!canManage) return null;

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

  return (
    <ScreenLayout edges={['top']}>
      <View className="bg-white border-b border-[#E2E8F0] h-14 px-2 flex-row items-center">
        <TouchableOpacity
          className="w-12 h-12 items-center justify-center"
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center">
          {isEdit ? 'Edit vehicle' : 'Add vehicle'}
        </Text>
        <View className="w-12" />
      </View>

      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="items-center px-4 py-4 pb-10"
      >
        <View className="w-full max-w-lg gap-1.5 mb-4">
          <Text className="text-[15px] text-[#0F172A]">
            Vehicle number <Text className="text-[#DC2626]">*</Text>
          </Text>
          <TextInput
            className={`rounded-lg border border-[#E2E8F0] h-12 px-4 text-[15px] ${
              vehicleNumberLocked ? 'bg-[#F1F5F9] text-[#0F172A]' : 'bg-white text-[#0F172A]'
            }`}
            placeholder="e.g. KA-01-AB-1234"
            placeholderTextColor="#94A3B8"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            editable={!vehicleNumberLocked}
            autoCapitalize="characters"
            accessibilityLabel={
              vehicleNumberLocked
                ? 'Vehicle number, locked after fuel assignments'
                : 'Vehicle number'
            }
          />
          <Text className="text-[13px] text-[#64748B]">
            {vehicleNumberLocked
              ? 'Vehicle number cannot be changed after fuel has been assigned.'
              : 'Use the official registration as on the number plate.'}
          </Text>
        </View>

        <View className="w-full max-w-lg gap-1.5 mb-6">
          <Text className="text-[15px] text-[#0F172A]">Notes (optional)</Text>
          <TextInput
            className="border border-[#E2E8F0] rounded-lg min-h-[100px] px-4 py-3 bg-white text-[15px] text-[#0F172A]"
            placeholder="Driver, type, etc."
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Notes"
          />
        </View>

        <TouchableOpacity
          className={`mb-8 h-[50px] w-full max-w-lg flex-row items-center justify-center gap-2 rounded-[10px] px-4 ${
            saving ? 'bg-[#1E40AF]/80' : 'bg-[#1E40AF]'
          }`}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, busy: saving }}
          accessibilityLabel={saving ? 'Saving vehicle, please wait' : 'Save vehicle'}
        >
          {saving ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
            </>
          ) : (
            <Text className="text-[15px] font-semibold text-white">Save vehicle</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
};
