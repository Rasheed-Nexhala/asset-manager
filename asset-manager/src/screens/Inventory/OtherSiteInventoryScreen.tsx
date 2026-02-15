import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components';
import { InventoryListItem } from '../../components/Inventory/InventoryListItem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchInventoryByLocation } from '../../store/thunks/inventoryThunks';
import { selectInventoryByLocation, selectItemsLoading, selectItemsError, selectAllItems } from '../../store/selectors/inventorySelectors';
import { getSite } from '../../services/firebase/siteService';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import { getLocationId } from '../../utils/locationUtils';
import type { Site } from '../../types/sites';
import type { InventoryEntry, Item } from '../../types/inventory';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

type NavigationProp = StackNavigationProp<InventoryStackParamList, 'OtherSiteInventory'>;

interface RouteParams {
  siteId: string;
}

/**
 * Other Site Inventory Screen - Read-only view of inventory at another site
 * 
 * Displays:
 * - Site name and title
 * - Manager and contact information (if available)
 * - Info banner about contacting Store Incharge for transfers
 * - List of inventory items at the site (read-only)
 */
export const OtherSiteInventoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { siteId } = (route.params as RouteParams) || {};

  const [site, setSite] = useState<Site | null>(null);
  const [siteLoading, setSiteLoading] = useState<boolean>(true);
  const [siteError, setSiteError] = useState<string | null>(null);

  // Redux state - use standardized location ID format
  // Memoize selector to avoid "new reference" warning - only recreate when locationId changes
  const locationId = siteId ? getLocationId('site', siteId) : '';
  const selectInventoryForLocation = useMemo(
    () => selectInventoryByLocation(locationId),
    [locationId]
  );
  const inventoryEntries = useAppSelector(selectInventoryForLocation);
  const allItems = useAppSelector(selectAllItems);
  const isLoading = useAppSelector(selectItemsLoading);
  const error = useAppSelector(selectItemsError);

  // Load site information
  useEffect(() => {
    const loadSite = async () => {
      if (!siteId) {
        setSiteLoading(false);
        setSiteError('Site ID is required');
        return;
      }

      try {
        setSiteLoading(true);
        setSiteError(null);
        const siteData = await getSite(siteId);
        if (!siteData) {
          setSiteError('Site not found');
        } else {
          setSite(siteData);
        }
      } catch (err: any) {
        console.error('Error loading site:', err);
        setSiteError(err.message || 'Failed to load site information');
      } finally {
        setSiteLoading(false);
      }
    };

    loadSite();
  }, [siteId]);

  // Fetch inventory for the site
  useEffect(() => {
    if (!siteId) return;

    const loadInventory = async () => {
      try {
        await dispatch(fetchInventoryByLocation(getLocationId('site', siteId))).unwrap();
      } catch (err: any) {
        console.error('Error loading inventory:', err);
      }
    };

    loadInventory();
  }, [dispatch, siteId]);

  // Fetch items if not already loaded (needed for type and unit)
  useEffect(() => {
    if (allItems.length === 0) {
      dispatch(fetchItems());
    }
  }, [dispatch, allItems.length]);

  // Map inventory entries to items for display (filter out entries without items)
  // Also deduplicate entries by entry.id to prevent duplicate key errors
  const inventoryWithItems = useMemo(() => {
    // Use Map to deduplicate by entry.id (keeps only the first occurrence)
    const uniqueEntriesMap = new Map<string, InventoryEntry>();
    inventoryEntries.forEach((entry) => {
      if (!uniqueEntriesMap.has(entry.id)) {
        uniqueEntriesMap.set(entry.id, entry);
      }
    });
    
    // Convert map values back to array, enrich with item data, and filter out entries without items
    return Array.from(uniqueEntriesMap.values())
      .map((entry) => {
        const item = allItems.find((item) => item.id === entry.itemId);
        if (!item) return null;
        return {
          entry,
          item,
        };
      })
      .filter((item): item is { entry: InventoryEntry; item: Item } => item !== null);
  }, [inventoryEntries, allItems]);

  const handleBack = useCallback(() => {
    // @ts-ignore - navigation typing varies by navigator
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // Loading state
  if (siteLoading || isLoading) {
    return (
      <ScreenLayout edges={['top']}>
        <View className="bg-white border-b border-[#E2E8F0] px-4 h-14 flex-row items-center justify-between">
          <TouchableOpacity
            className="w-11 h-11 items-center justify-center -ml-2"
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-[22px] font-semibold text-[#0F172A]">Loading...</Text>
          <View className="w-11" />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading site inventory...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  // Error state
  if (siteError || error) {
    return (
      <ScreenLayout edges={['top']}>
        <View className="bg-white border-b border-[#E2E8F0] px-4 h-14 flex-row items-center justify-between">
          <TouchableOpacity
            className="w-11 h-11 items-center justify-center -ml-2"
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-[22px] font-semibold text-[#0F172A]">
            {site?.name || 'Site'} Inventory
          </Text>
          <View className="w-11" />
        </View>
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text className="text-[22px] font-semibold text-[#0F172A] mt-4 mb-2 text-center">
            Error Loading Data
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center">
            {siteError || error || 'An unexpected error occurred'}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  const siteName = site?.name || 'Site';
  const managerName = site?.managerName;
  const contactNumber = site?.contactNumber;

  return (
    <ScreenLayout edges={['top']}>
      {/* Custom Header with Back Button */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 h-14 flex-row items-center justify-between">
        <TouchableOpacity
          className="w-11 h-11 items-center justify-center -ml-2"
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center">
          {siteName} Inventory – Read-only
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View className="bg-[#3B82F6]/15 px-4 py-3 mx-4 mt-4 rounded-[10px] border border-[#3B82F6]/30">
          <View className="flex-row items-start gap-3">
            <Ionicons name="information-circle" size={20} color="#1E40AF" />
            <Text className="text-[13px] text-[#1E40AF] flex-1">
              Need these items? Contact Store Incharge to coordinate transfer.
            </Text>
          </View>
        </View>

        {/* Manager and Contact Information */}
        {(managerName || contactNumber) && (
          <View className="px-4 mt-4">
            <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                Site Information
              </Text>
              
              {managerName && (
                <View className="mb-3">
                  <Text className="text-[13px] text-[#64748B] mb-1">Site Manager</Text>
                  <Text className="text-[15px] text-[#0F172A]">{managerName}</Text>
                </View>
              )}

              {contactNumber && (
                <View>
                  <Text className="text-[13px] text-[#64748B] mb-1">Contact Number</Text>
                  <Text className="text-[15px] text-[#0F172A]">{contactNumber}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Inventory List */}
        <View className="px-4 mt-4 pb-6">
          {inventoryWithItems.length === 0 ? (
            <View className="bg-white rounded-[10px] p-8 items-center border border-[#E2E8F0]">
              <Ionicons name="cube-outline" size={48} color="#94A3B8" />
              <Text className="text-[22px] font-semibold text-[#0F172A] mt-4 mb-2 text-center">
                No Inventory Items
              </Text>
              <Text className="text-[15px] text-[#64748B] text-center">
                This site currently has no inventory items.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {inventoryWithItems.map(({ entry, item }) => (
                <InventoryListItem
                  key={entry.id}
                  entry={entry}
                  imageUrl={item.imageUrl}
                  type={item.type}
                  unit={item.unit}
                  weightPerMeter={item.weightPerMeter}
                  lengthPerPiece={item.lengthPerPiece ?? entry.lengthPerPiece}
                  // Read-only, so no onPress handler
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
