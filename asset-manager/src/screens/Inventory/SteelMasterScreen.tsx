/**
 * Steel Master Screen
 * Manage standard steel item specifications for weight-based conversion
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { SteelMasterForm } from '../../components/Inventory/SteelMasterForm';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchSteelMasters,
  createSteelMaster,
  updateSteelMaster,
  deleteSteelMaster,
} from '../../store/thunks/steelMasterThunks';
import { clearSteelMasterError } from '../../store/slices/steelMasterSlice';
import {
  selectActiveSteelMasters,
  selectSteelMasterLoading,
  selectSteelMasterError,
} from '../../store/selectors/steelMasterSelectors';
import { subscribeSteelMasters } from '../../services/firebase/steelMasterService';
import { setSteelMasters } from '../../store/slices/steelMasterSlice';
import type {
  SteelMaster,
  CreateSteelMasterData,
  UpdateSteelMasterData,
} from '../../types/steelMaster';

export const SteelMasterScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMaster, setEditingMaster] = useState<SteelMaster | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steelMasters = useAppSelector(selectActiveSteelMasters);
  const isLoading = useAppSelector(selectSteelMasterLoading);
  const error = useAppSelector(selectSteelMasterError);

  useEffect(() => {
    dispatch(fetchSteelMasters(true));

    const unsubscribe = subscribeSteelMasters(
      (masters: SteelMaster[]) => {
        dispatch(setSteelMasters(masters.filter((m) => m.isActive)));
      },
      true
    );

    return () => unsubscribe();
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchSteelMasters(true)).finally(() => setRefreshing(false));
  }, [dispatch]);

  const handleAdd = useCallback(() => {
    setEditingMaster(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((master: SteelMaster) => {
    setEditingMaster(master);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    (master: SteelMaster) => {
      Alert.alert(
        'Deactivate Steel Master',
        `Are you sure you want to deactivate "${master.name}"? It will no longer appear in the list but linked items will keep their configuration.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(deleteSteelMaster(master.id)).unwrap();
              } catch (err: unknown) {
                const msg =
                  err instanceof Error ? err.message : 'Failed to deactivate';
                Alert.alert('Error', msg);
              }
            },
          },
        ]
      );
    },
    [dispatch]
  );

  const handleFormSubmit = useCallback(
    async (data: CreateSteelMasterData | UpdateSteelMasterData) => {
      setIsSubmitting(true);
      dispatch(clearSteelMasterError());
      try {
        if (editingMaster) {
          await dispatch(
            updateSteelMaster({
              id: editingMaster.id,
              updates: data as UpdateSteelMasterData,
            })
          ).unwrap();
        } else {
          await dispatch(createSteelMaster(data as CreateSteelMasterData)).unwrap();
        }
        setShowForm(false);
        setEditingMaster(null);
      } catch (err) {
        // Error shown in form via Redux
      } finally {
        setIsSubmitting(false);
      }
    },
    [dispatch, editingMaster]
  );

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
    setEditingMaster(null);
    dispatch(clearSteelMasterError());
  }, [dispatch]);

  const renderItem = useCallback(
    ({ item }: { item: SteelMaster }) => (
      <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-[15px] font-semibold text-[#0F172A] flex-1">
            {item.name}
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center rounded-lg border border-[#E2E8F0]"
              onPress={() => handleEdit(item)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
            >
              <Ionicons name="pencil" size={18} color="#1E40AF" />
            </TouchableOpacity>
            <TouchableOpacity
              className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center rounded-lg border border-[#E2E8F0]"
              onPress={() => handleDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={`Deactivate ${item.name}`}
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">Weight/m</Text>
            <Text className="text-[15px] text-[#0F172A]">
              {item.weightPerMeter} kg/m
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">Default Length</Text>
            <Text className="text-[15px] text-[#0F172A]">{item.defaultLength}m</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">SKU</Text>
            <Text className="text-[15px] text-[#0F172A]">{item.hsnCode}</Text>
          </View>
        </View>
      </View>
    ),
    [handleEdit, handleDelete]
  );

  const renderCustomHeader = () => (
    <View className="bg-white border-b border-[#E2E8F0] px-4 flex-row items-center justify-between h-14">
      <TouchableOpacity
        className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center"
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color="#0F172A" />
      </TouchableOpacity>
      
      <Text 
        className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center" 
        accessibilityRole="header"
        numberOfLines={1}
      >
        Steel Master
      </Text>
      
      <TouchableOpacity
        className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center rounded-[10px]"
        onPress={handleAdd}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Add steel master"
      >
        <Ionicons name="add-circle" size={24} color="#1E40AF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenLayout edges={['top']}>
      {renderCustomHeader()}

      {isLoading && steelMasters.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading steel masters...
          </Text>
        </View>
      ) : steelMasters.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="construct-outline" size={80} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Steel Masters
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center mb-6">
            Add standard steel item specifications for KG-to-pieces conversion.
          </Text>
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center flex-row gap-2"
            onPress={handleAdd}
            accessibilityRole="button"
            accessibilityLabel="Add first steel master"
          >
            <Ionicons name="add-circle" size={22} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">
              Add Steel Master
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={steelMasters}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1E40AF"
            />
          }
        />
      )}

      <SteelMasterForm
        visible={showForm}
        mode={editingMaster ? 'edit' : 'create'}
        initialData={editingMaster}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
        loading={isSubmitting}
        error={error}
      />
    </ScreenLayout>
  );
};
