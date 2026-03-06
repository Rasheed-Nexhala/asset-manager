import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StockStatusBadge, type StockStatus } from '../../components/Inventory/StockStatusBadge';
import { InventoryAdjustmentModal } from '../../components/Inventory/InventoryAdjustmentModal';
import { RequestAccessBanner } from '../../components/Inventory/RequestAccessBanner';
import { RequestInventoryAccessModal } from '../../components/Inventory/RequestInventoryAccessModal';
import { WeightDisplay } from '../../components/Inventory/WeightDisplay';
import { ViewModeToggle } from '../../components/Inventory/ViewModeToggle';
import { useWeightViewPreference, type WeightViewMode } from '../../hooks/useWeightViewPreference';
import { isWeightViewSupported } from '../../utils/weightConversionUtils';
import { isLowStock } from '../../utils/inventoryUtils';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchItemById, adjustQuantity } from '../../store/thunks/inventoryThunks';
import { createInventoryUpdateRequest } from '../../store/thunks/inventoryUpdateRequestThunks';
import { selectItemById, selectItemsLoading, selectItemsError } from '../../store/selectors/inventorySelectors';
import { selectIsAdmin, selectIsStoreIncharge, selectRoleLoading, selectIsRoleLoaded } from '../../store/selectors/authSelectors';
import { selectCanStoreInchargeAdjustInventory, selectMyAccessGrantedUntil } from '../../store/selectors/inventoryUpdateRequestSelectors';
import { updateItemInState, clearError } from '../../store/slices/inventorySlice';
import { subscribeItemById, subscribeInventoryByItemId } from '../../services/firebase/inventoryService';
import type { Item, AdjustmentData, AdjustmentType, InventoryEntry } from '../../types/inventory';

type NavigationProp = StackNavigationProp<InventoryStackParamList, 'ItemDetail'>;

interface RouteParams {
  itemId: string;
}

type LocationType = 'store' | 'site' | 'maintenance';

/** Sort order for location types: store first, then sites, then maintenance */
const LOCATION_ORDER: Record<LocationType, number> = {
  store: 0,
  site: 1,
  maintenance: 2,
};

interface StockDistributionBreakdownProps {
  entries: InventoryEntry[];
  item: Item;
  viewMode: WeightViewMode;
}

/**
 * Displays per-location stock breakdown: Central Store, each site, Maintenance.
 * Shows location name and quantity for each.
 */
function StockDistributionBreakdown({
  entries,
  item,
  viewMode,
}: StockDistributionBreakdownProps) {
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const orderA = LOCATION_ORDER[a.locationType as LocationType] ?? 2;
      const orderB = LOCATION_ORDER[b.locationType as LocationType] ?? 2;
      if (orderA !== orderB) return orderA - orderB;
      return (a.locationName ?? '').localeCompare(b.locationName ?? '');
    });
  }, [entries]);

  if (sortedEntries.length === 0) return null;

  const getLocationIcon = (locationType: string): 'business-outline' | 'build-outline' | 'construct-outline' => {
    if (locationType === 'store') return 'business-outline';
    if (locationType === 'maintenance') return 'build-outline';
    return 'construct-outline';
  };

  return (
    <View className="mt-3 bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
      <Text className="text-[15px] font-semibold text-[#0F172A] mb-3">
        By Location
      </Text>
      <View className="gap-3">
        {sortedEntries.map((entry) => (
          <View
            key={entry.id}
            className="flex-row items-center justify-between py-2 border-b border-[#E2E8F0] last:border-b-0"
          >
            <View className="flex-row items-center gap-2 flex-1">
              <Ionicons
                name={getLocationIcon(entry.locationType)}
                size={20}
                color="#64748B"
              />
              <Text className="text-[15px] text-[#0F172A]" numberOfLines={1}>
                {entry.locationName || entry.locationId || 'Unknown'}
              </Text>
            </View>
            <WeightDisplay
              quantity={entry.quantity}
              weightPerMeter={item.weightPerMeter}
              lengthPerPiece={entry.lengthPerPiece ?? item.lengthPerPiece}
              viewMode={viewMode}
              unit={item.unit}
            />
          </View>
        ))}
      </View>
    </View>
  );
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
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isRoleLoading = useAppSelector(selectRoleLoading);
  const isRoleLoaded = useAppSelector(selectIsRoleLoaded);
  const canEditItem = isAdmin || isStoreIncharge;
  const canStoreInchargeAdjust = useAppSelector(selectCanStoreInchargeAdjustInventory);
  const isAdjustmentSectionReady = isRoleLoaded && !isRoleLoading;
  const myAccessGrantedUntil = useAppSelector(selectMyAccessGrantedUntil);
  const { viewMode, toggleViewMode } = useWeightViewPreference();
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentType | null>(null);
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [inventoryByLocation, setInventoryByLocation] = useState<InventoryEntry[]>([]);
  const isSteelItem = item ? isWeightViewSupported(item) : false;

  // Fetch item if not in store
  useEffect(() => {
    if (!item && itemId && !isLoading) {
      dispatch(fetchItemById(itemId));
    }
  }, [dispatch, itemId, item, isLoading]);

  // Real-time subscription: update item when Firestore changes (add stock, transfer, maintenance, etc.)
  useFocusEffect(
    useCallback(() => {
      if (!itemId) return;
      const unsubscribe = subscribeItemById(itemId, (updatedItem) => {
        if (updatedItem) {
          dispatch(updateItemInState(updatedItem));
        }
      });
      return () => unsubscribe();
    }, [itemId, dispatch])
  );

  // Real-time subscription: per-location inventory for stock distribution breakdown
  useFocusEffect(
    useCallback(() => {
      if (!itemId) return;
      const unsubscribe = subscribeInventoryByItemId(itemId, (entries) => {
        setInventoryByLocation(entries);
      });
      return () => unsubscribe();
    }, [itemId])
  );

  // Determine stock status based on quantity vs min level
  const stockStatus: StockStatus = useMemo(() => {
    if (!item) return 'adequate';
    if (item.status === 'discontinued') return 'discontinued';
    if (isLowStock(item)) return 'low_stock';
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

  const handleAdjustStock = useCallback((mode: AdjustmentType) => {
    setAdjustmentMode(mode);
  }, []);

  const handleStockSubmit = useCallback(
    async (adjustmentData: AdjustmentData) => {
      setIsSubmitting(true);
      try {
        await dispatch(adjustQuantity(adjustmentData)).unwrap();
        // Real-time subscription will update the item; no need to refetch
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to add stock';
        throw new Error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [dispatch]
  );

  const handleRequestAccessSubmit = useCallback(
    async (data: { reason: string; notes?: string }) => {
      const reason = data.reason.trim() + (data.notes?.trim() ? ` - ${data.notes.trim()}` : '');
      setIsRequestingAccess(true);
      try {
        await dispatch(createInventoryUpdateRequest(reason)).unwrap();
        setShowRequestAccessModal(false);
        Alert.alert('Request Submitted', 'Your request has been sent. Admin will review it shortly.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to submit request';
        throw new Error(msg);
      } finally {
        setIsRequestingAccess(false);
      }
    },
    [dispatch]
  );

  useAutoClearError(error, () => dispatch(clearError()));

  const formatAccessExpiry = useCallback((isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }, []);

  // Loading state
  if (isLoading && !item) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Item Details" showBack onBackPress={handleBack} />
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
        <ScreenHeader title="Item Details" showBack onBackPress={handleBack} />
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
        <ScreenHeader title="Item Details" showBack onBackPress={handleBack} />
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
        showBack
        onBackPress={handleBack}
        rightAction={
          canEditItem
            ? {
                icon: 'create-outline',
                onPress: handleEdit,
                accessibilityLabel: 'Edit item',
              }
            : undefined
        }
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

          {/* Per-location breakdown: Central Store, each site, Maintenance */}
          <StockDistributionBreakdown
            entries={inventoryByLocation}
            item={item}
            viewMode={viewMode}
          />
        </View>

        {/* Stock Level & Status Card - hidden for Site Manager (internal store metric) */}
        {canEditItem && (
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
                    isLowStock(item)
                      ? 'bg-[#DC2626]'
                      : (item.centralStoreQuantity ?? item.totalQuantity ?? 0) <=
                        ((item.minStockLevel ?? 0) * 1.5)
                      ? 'bg-[#D97706]'
                      : 'bg-[#16A34A]'
                  }`}
                  style={{
                    width: (() => {
                      const qty =
                        item.centralStoreQuantity ?? item.totalQuantity ?? 0;
                      const min = item.minStockLevel ?? 0;
                      const pct =
                        min === 0
                          ? qty > 0
                            ? 100
                            : 0
                          : Math.min((qty / (min * 2)) * 100, 100);
                      return `${pct}%`;
                    })(),
                  }}
                />
              </View>
            </View>
          </View>
        </View>
        )}

        {/* Stock Actions card: CIAMS design system — primary (Add), semantic (Reduce), secondary (Enter, Edit) */}
        {!isAdjustmentSectionReady && canEditItem && (
          <View className="mb-3 mt-2 py-4 items-center justify-center rounded-[10px] bg-white border border-[#E2E8F0]">
            <ActivityIndicator size="small" color="#1E40AF" />
            <Text className="text-[13px] text-[#64748B] mt-2">Loading permissions…</Text>
          </View>
        )}
        {isAdjustmentSectionReady && (isAdmin || (isStoreIncharge && canStoreInchargeAdjust)) && (
          <View className="mb-3 bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">Stock Actions</Text>
            {myAccessGrantedUntil && (
              <Text className="text-[13px] text-[#64748B] mb-3">
                Access expires at {formatAccessExpiry(myAccessGrantedUntil)}
              </Text>
            )}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-[#1E40AF] rounded-[10px] min-h-[50px] items-center justify-center flex-row gap-2 px-2"
                onPress={() => handleAdjustStock('add')}
                activeOpacity={0.7}
                accessibilityLabel="Add stock"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text className="text-[15px] font-semibold text-white">Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 border-[1.5px] border-[#DC2626] rounded-[10px] min-h-[50px] items-center justify-center flex-row gap-2 px-2 bg-[#DC2626]/5"
                onPress={() => handleAdjustStock('remove')}
                activeOpacity={0.7}
                accessibilityLabel="Reduce stock"
                accessibilityRole="button"
              >
                <Ionicons name="remove-circle" size={20} color="#DC2626" />
                <Text className="text-[15px] font-semibold text-[#DC2626]">Reduce</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] min-h-[50px] items-center justify-center flex-row gap-2 px-2"
                onPress={() => handleAdjustStock('set')}
                activeOpacity={0.7}
                accessibilityLabel="Enter stock"
                accessibilityRole="button"
              >
                <Ionicons name="create-outline" size={20} color="#1E40AF" />
                <Text className="text-[15px] font-semibold text-[#1E40AF]">Enter</Text>
              </TouchableOpacity>
            </View>
            {canEditItem && (
              <TouchableOpacity
                className="mt-4 border-[1.5px] border-[#E2E8F0] rounded-[10px] min-h-[50px] items-center justify-center flex-row gap-2"
                onPress={handleEdit}
                activeOpacity={0.7}
                accessibilityLabel="Edit item"
                accessibilityRole="button"
              >
                <Ionicons name="pencil-outline" size={20} color="#64748B" />
                <Text className="text-[15px] font-semibold text-[#64748B]">Edit Item</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Store Incharge without access: Request Access banner (only when role is loaded) */}
        {isAdjustmentSectionReady && isStoreIncharge && !canStoreInchargeAdjust && (
          <View className="mb-3 mt-2">
            <RequestAccessBanner onRequestAccess={() => setShowRequestAccessModal(true)} />
          </View>
        )}

        {/* Edit Item only when can edit but no stock adjustment access (e.g. Store Incharge without approval) */}
        {isAdjustmentSectionReady && canEditItem && !(isAdmin || (isStoreIncharge && canStoreInchargeAdjust)) && (
          <View className="mb-6 bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
            <TouchableOpacity
              className="border-[1.5px] border-[#1E40AF] rounded-[10px] min-h-[50px] items-center justify-center flex-row gap-2"
              onPress={handleEdit}
              activeOpacity={0.7}
              accessibilityLabel="Edit item"
              accessibilityRole="button"
            >
              <Ionicons name="pencil-outline" size={20} color="#1E40AF" />
              <Text className="text-[15px] font-semibold text-[#1E40AF]">Edit Item</Text>
            </TouchableOpacity>
          </View>
        )}

        {adjustmentMode && (
          <InventoryAdjustmentModal
            visible={!!adjustmentMode}
            mode={adjustmentMode}
            item={item}
            onSubmit={handleStockSubmit}
            onCancel={() => setAdjustmentMode(null)}
            loading={isSubmitting}
          />
        )}

        <RequestInventoryAccessModal
          visible={showRequestAccessModal}
          onSubmit={handleRequestAccessSubmit}
          onCancel={() => setShowRequestAccessModal(false)}
          loading={isRequestingAccess}
        />
      </ScrollView>
    </ScreenLayout>
  );
};
