/**
 * AddEditCustomItemScreen
 * Full-screen form for adding or editing custom items (steel master specs).
 * Follows CIAMS design system with ScreenLayout and ScreenHeader.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ScreenHeader, ScreenLayout } from '../../components';
import { SteelMasterForm } from '../../components/Inventory/SteelMasterForm';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createSteelMaster,
  updateSteelMaster,
  fetchSteelMasterById,
} from '../../store/thunks/steelMasterThunks';
import { clearSteelMasterError } from '../../store/slices/steelMasterSlice';
import {
  selectSteelMasterError,
  selectSteelMasterLoading,
} from '../../store/selectors/steelMasterSelectors';
import type {
  SteelMaster,
  CreateSteelMasterData,
  UpdateSteelMasterData,
} from '../../types/steelMaster';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

type NavigationProp = StackNavigationProp<
  InventoryStackParamList,
  'AddEditCustomItem'
>;

interface RouteParams {
  customItemId?: string;
}

export const AddEditCustomItemScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const dispatch = useAppDispatch();

  const { customItemId } = (route.params as RouteParams) || {};
  const mode: 'create' | 'edit' = customItemId ? 'edit' : 'create';

  const error = useAppSelector(selectSteelMasterError);
  const [editingMaster, setEditingMaster] = useState<SteelMaster | null>(null);
  const [loadingItem, setLoadingItem] = useState(mode === 'edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && customItemId) {
      const load = async () => {
        setLoadingItem(true);
        try {
          const master = await dispatch(
            fetchSteelMasterById(customItemId)
          ).unwrap();
          setEditingMaster(master);
        } catch {
          setEditingMaster(null);
        } finally {
          setLoadingItem(false);
        }
      };
      load();
    }
  }, [mode, customItemId, dispatch]);

  const handleSubmit = useCallback(
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
        navigation.goBack();
      } finally {
        setIsSubmitting(false);
      }
    },
    [dispatch, editingMaster, navigation]
  );

  const handleCancel = useCallback(() => {
    dispatch(clearSteelMasterError());
    navigation.goBack();
  }, [dispatch, navigation]);

  const title = mode === 'create' ? 'Add Custom Item' : 'Edit Custom Item';

  return (
    <ScreenLayout edges={['top']} keyboardAware>
      <ScreenHeader
        title={title}
        showBack
        onBackPress={handleCancel}
      />
      {loadingItem ? (
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading custom item...
          </Text>
        </View>
      ) : (
        <SteelMasterForm
          asScreen
          mode={mode}
          initialData={editingMaster}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={isSubmitting}
          error={error}
        />
      )}
    </ScreenLayout>
  );
};
