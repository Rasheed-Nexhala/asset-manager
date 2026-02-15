import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StockStatusBadge, type StockStatus } from '../../components/Inventory/StockStatusBadge';
import { StockEntryModal } from '../../components/Inventory/StockEntryModal';
import { WeightDisplay } from '../../components/Inventory/WeightDisplay';
import { ViewModeToggle } from '../../components/Inventory/ViewModeToggle';
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import { isWeightViewSupported } from '../../utils/weightConversionUtils';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchItemById,
  adjustQuantity,
  fetchInventoryByLocation,
} from '../../store/thunks/inventoryThunks';
import { selectItemById, selectItemsLoading, selectItemsError } from '../../store/selectors/inventorySelectors';
import { getLocationId } from '../../utils/locationUtils';
import type { Item, AdjustmentData } from '../../types/inventory';

type NavigationProp = StackNavigationProp<InventoryStackParamList, 'ItemDetail'>;

interface RouteParams {
  itemId: string;
}

/**
 * ItemDetailScreen component
 * 
 * Displays detailed information about an inventory item including:
 * - Image, name, SKU, type, category, unit
 * - Stock distribution (total, central, per site, maintenance)
 * - Min level and status
 * - Edit Item action
 * 
 * Follows CIAMS design system with Standard Screen Layout pattern
 */
export const ItemDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { itemId } = (route.params as RouteParams) || {};

  const item = useAppSelector((state) => selectItemById(itemId)(state));
  const isLoading = useAppSelector(selectItemsLoading);
  const error = useAppSelector(selectItemsError);
  const { viewMode, toggleViewMode } = useWeightViewPreference();
  const [showStockModal, setShowStockModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSteelItem = item ? isWeightViewSupported(item) : false;

  // Fetch item if not in store
  useEffect(() => {
    if (!item && itemId && !isLoading) {
      dispatch(fetchItemById(itemId));
    }
  }, [dispatch, itemId, item, isLoading]);

  // Determine stock status based on quantity vs min level
  const stockStatus: StockStatus = useMemo(() => {
    if (!item) return 'adequate';
    if (item.status === 'discontinued') return 'discontinued';
    if (item.totalQuantity <= item.minStockLevel) return 'low_stock';
    return 'adequate';
  }, [item]);

  // Format item type label
  const itemTypeLabel = useMemo(() => {
    if (!item) return '';
    return item.type === 'consumable' ? 'Consumable' : 'Non-Consumable';
  }, [item]);

  // Handle edit navigation
  const handleEdit = useCallback(() => {
    if (!itemId) return;
    navigation.navigate('AddEditItem', { itemId });
  }, [navigation, itemId]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAddStock = useCallback(() => {
    setShowStockModal(true);
  }, []);

  const handleStockSubmit = useCallback(
    async (adjustmentData: AdjustmentData) => {
      setIsSubmitting(true);
      try {
        await dispatch(adjustQuantity(adjustmentData)).unwrap();
        await dispatch(fetchInventoryByLocation(getLocationId('store')));
        await dispatch(fetchItemById(itemId));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to add stock';
        throw new Error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [dispatch, itemId]
  );

  // Loading state
  if (isLoading && !item) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Item Details" />
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading item details...</Text>
        </View>
      </ScreenLayout>
    );
  }

  // Error state
  if (error && !item) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Item Details" />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text className="text-[17px] font-semibold text-[#0F172A] mt-4 text-center">
            Error Loading Item
          </Text>
          <Text className="text-[15px] text-[#64748B] mt-2 text-center">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center mt-6"
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text className="text-[15px] font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  // Item not found state
  if (!item) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Item Details" />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="cube-outline" size={48} color="#94A3B8" />
          <Text className="text-[17px] font-semibold text-[#0F172A] mt-4 text-center">
            Item Not Found
          </Text>
          <Text className="text-[15px] text-[#64748B] mt-2 text-center">
            The item you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center mt-6"
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text className="text-[15px] font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Item Details"
        rightAction={{
          icon: 'create-outline',
          onPress: handleEdit,
          accessibilityLabel: 'Edit item',
        }}
      />

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Image Section */}
        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3 mt-4">
          <View className="w-full h-64 rounded-lg bg-[#F1F5F9] items-center justify-center overflow-hidden mb-4">
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="cube-outline" size={64} color="#94A3B8" />
            )}
          </View>

          {/* Name and Status */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-[22px] font-semibold text-[#0F172A] mb-2" numberOfLines={2}>
                {item.name}
              </Text>
              <Text className="text-[13px] text-[#64748B]">SKU: {item.sku}</Text>
            </View>
            <StockStatusBadge status={stockStatus} />
          </View>
        </View>

        {/* Basic Information Card */}
        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
          <Text className="text-[17px] font-semibold text-[#0F172A] mb-4">Basic Information</Text>
          
          <View className="gap-4">
            {/* Type */}
            <View className="flex-row justify-between items-center">
              <Text className="text-[13px] text-[#64748B]">Type</Text>
              <Text className="text-[15px] text-[#0F172A]">{itemTypeLabel}</Text>
            </View>

            {/* Category */}
            <View className="flex-row justify-between items-center">
              <Text className="text-[13px] text-[#64748B]">Category</Text>
              <Text className="text-[15px] text-[#0F172A]">{item.categoryName}</Text>
            </View>

            {/* Unit */}
            <View className="flex-row justify-between items-center">
              <Text className="text-[13px] text-[#64748B]">Unit</Text>
              <Text className="text-[15px] text-[#0F172A]">{item.unit}</Text>
            </View>

            {/* Description (if available) */}
            {item.description && (
              <View>
                <Text className="text-[13px] text-[#64748B] mb-1.5">Description</Text>
                <Text className="text-[15px] text-[#0F172A]">{item.description}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stock Distribution Section */}
        <View className="mb-3">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-[17px] font-semibold text-[#0F172A]">Stock Distribution</Text>
            {isSteelItem && (
              <ViewModeToggle viewMode={viewMode} onToggle={toggleViewMode} />
            )}
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
            contentContainerStyle={{ paddingHorizontal: 0 }}
          >
            <View className="flex-row gap-3">
              {/* Total Quantity KPI */}
              <View className="bg-white rounded-xl p-4 shadow-sm min-w-[45%]">
                <View className="mb-2">
                  <Ionicons name="cube-outline" size={32} color="#1E40AF" />
                </View>
                <WeightDisplay
                  quantity={item.totalQuantity}
                  weightPerMeter={item.weightPerMeter}
                  lengthPerPiece={item.lengthPerPiece}
                  viewMode={viewMode}
                  unit={item.unit}
                  size="large"
                />
                <Text className="text-[13px] text-[#64748B] mt-1">Total Stock</Text>
              </View>

              {/* Central Store KPI */}
              <View className="bg-white rounded-xl p-4 shadow-sm min-w-[45%]">
                <View className="mb-2">
                  <Ionicons name="business-outline" size={32} color="#1E40AF" />
                </View>
                <WeightDisplay
                  quantity={item.centralStoreQuantity}
                  weightPerMeter={item.weightPerMeter}
                  lengthPerPiece={item.lengthPerPiece}
                  viewMode={viewMode}
                  unit={item.unit}
                  size="large"
                />
                <Text className="text-[13px] text-[#64748B] mt-1">Central Store</Text>
              </View>

              {/* At Sites KPI */}
              <View className="bg-white rounded-xl p-4 shadow-sm min-w-[45%]">
                <View className="mb-2">
                  <Ionicons name="construct-outline" size={32} color="#1E40AF" />
                </View>
                <WeightDisplay
                  quantity={item.atSitesQuantity}
                  weightPerMeter={item.weightPerMeter}
                  lengthPerPiece={item.lengthPerPiece}
                  viewMode={viewMode}
                  unit={item.unit}
                  size="large"
                />
                <Text className="text-[13px] text-[#64748B] mt-1">At Sites</Text>
              </View>

              {/* Maintenance KPI */}
              <View className="bg-white rounded-xl p-4 shadow-sm min-w-[45%]">
                <View className="mb-2">
                  <Ionicons name="build-outline" size={32} color="#1E40AF" />
                </View>
                <WeightDisplay
                  quantity={item.inMaintenanceQuantity}
                  weightPerMeter={item.weightPerMeter}
                  lengthPerPiece={item.lengthPerPiece}
                  viewMode={viewMode}
                  unit={item.unit}
                  size="large"
                />
                <Text className="text-[13px] text-[#64748B] mt-1">Maintenance</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Stock Level & Status Card */}
        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
          <Text className="text-[17px] font-semibold text-[#0F172A] mb-4">Stock Level & Status</Text>
          
          <View className="gap-4">
            {/* Minimum Stock Level */}
            <View className="flex-row justify-between items-center">
              <Text className="text-[13px] text-[#64748B]">Minimum Stock Level</Text>
              {isSteelItem ? (
                <WeightDisplay
                  quantity={item.minStockLevel}
                  weightPerMeter={item.weightPerMeter}
                  lengthPerPiece={item.lengthPerPiece}
                  viewMode={viewMode}
                  unit={item.unit}
                />
              ) : (
                <Text className="text-[15px] text-[#0F172A]">
                  {item.minStockLevel} {item.unit}
                </Text>
              )}
            </View>

            {/* Current Status */}
            <View className="flex-row justify-between items-center">
              <Text className="text-[13px] text-[#64748B]">Status</Text>
              <View className="flex-row items-center gap-2">
                <StockStatusBadge status={stockStatus} />
                {item.status === 'discontinued' && (
                  <View className="px-2 py-1 rounded-full bg-[#475569]/15">
                    <Text className="text-[12px] font-medium text-[#475569]">Discontinued</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stock Level Indicator */}
            <View className="mt-2">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-[13px] text-[#64748B]">Stock Level</Text>
                {isSteelItem ? (
                  <View className="flex-row items-center gap-1">
                    <WeightDisplay
                      quantity={item.totalQuantity}
                      weightPerMeter={item.weightPerMeter}
                      lengthPerPiece={item.lengthPerPiece}
                      viewMode={viewMode}
                      unit={item.unit}
                    />
                    <Text className="text-[13px] text-[#64748B]">/</Text>
                    <WeightDisplay
                      quantity={item.minStockLevel}
                      weightPerMeter={item.weightPerMeter}
                      lengthPerPiece={item.lengthPerPiece}
                      viewMode={viewMode}
                      unit={item.unit}
                    />
                  </View>
                ) : (
                  <Text className="text-[13px] text-[#64748B]">
                    {item.totalQuantity} / {item.minStockLevel} {item.unit}
                  </Text>
                )}
              </View>
              {/* Progress bar */}
              <View className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    item.totalQuantity <= item.minStockLevel
                      ? 'bg-[#DC2626]'
                      : item.totalQuantity <= item.minStockLevel * 1.5
                      ? 'bg-[#D97706]'
                      : 'bg-[#16A34A]'
                  }`}
                  style={{
                    width: `${Math.min((item.totalQuantity / (item.minStockLevel * 2)) * 100, 100)}%`,
                  }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mb-6 mt-2 gap-3">
          <TouchableOpacity
            className="bg-[#16A34A] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
            onPress={handleAddStock}
            activeOpacity={0.7}
            accessibilityLabel="Add stock"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">Add Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
            onPress={handleEdit}
            activeOpacity={0.7}
            accessibilityLabel="Edit item"
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={20} color="#1E40AF" />
            <Text className="text-[15px] font-semibold text-[#1E40AF]">Edit Item</Text>
          </TouchableOpacity>
        </View>

        <StockEntryModal
          visible={showStockModal}
          item={item}
          onSubmit={handleStockSubmit}
          onCancel={() => setShowStockModal(false)}
          loading={isSubmitting}
        />
      </ScrollView>
    </ScreenLayout>
  );
};
