import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUserId } from '../../store/selectors/authSelectors';
import { selectAllSites, selectSitesLoading } from '../../store/selectors/sitesSelectors';
import { selectAllItems, selectInventoryByLocation, selectItemsLoading } from '../../store/selectors/inventorySelectors';
import { fetchInventoryByLocation } from '../../store/slices/inventorySlice';
import { fetchSites, setSites } from '../../store/slices/sitesSlice';
import { subscribeToSites } from '../../services/firebase/siteService';
import { ScreenLayout, ScreenHeader } from '../../components';
import { InventoryListItem } from '../../components/Inventory';
import { getLocationId } from '../../utils/locationUtils';
import type { InventoryEntry, ItemType } from '../../types/inventory';
import type { Site } from '../../types/sites';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

type NavigationProp = StackNavigationProp<InventoryStackParamList, 'MySiteInventory'>;

/**
 * MySiteInventoryScreen - Displays inventory for the current user's site
 * 
 * Features:
 * - Shows inventory items for the user's assigned site
 * - Search functionality
 * - Action buttons (New Request, Return Items)
 * - View other sites section with navigation
 */
export const MySiteInventoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const userId = useAppSelector(selectUserId);
  const sites = useAppSelector(selectAllSites);
  const items = useAppSelector(selectAllItems);
  const isLoading = useAppSelector(selectItemsLoading);
  const sitesLoading = useAppSelector(selectSitesLoading);
  
  // Local state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [isLoadingSite, setIsLoadingSite] = useState<boolean>(true);
  
  // Fetch sites and set up real-time listener
  useEffect(() => {
    // Initial fetch
    dispatch(fetchSites());

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSites((updatedSites: Site[]) => {
      dispatch(setSites(updatedSites));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);
  
  // Find the user's site by matching managerId
  useEffect(() => {
    if (userId && sites.length > 0) {
      const userSite = sites.find((site) => site.managerId === userId);
      setCurrentSite(userSite || null);
      setIsLoadingSite(false);
    } else if (!sitesLoading && sites.length === 0) {
      // Only mark as loaded if sites have finished loading and still empty
      setIsLoadingSite(false);
    }
  }, [userId, sites, sitesLoading]);
  
  // Fetch inventory when site is found
  useEffect(() => {
    if (currentSite) {
      dispatch(fetchInventoryByLocation(getLocationId('site', currentSite.id)));
    }
  }, [currentSite, dispatch]);
  
  // Get inventory for current site (standardized location ID format)
  // Memoize selector to avoid "new reference" warning - only recreate when siteLocationId changes
  const siteLocationId = currentSite ? getLocationId('site', currentSite.id) : '';
  const selectInventoryForSite = useMemo(
    () => selectInventoryByLocation(siteLocationId),
    [siteLocationId]
  );
  const inventoryEntries = useAppSelector(selectInventoryForSite);
  
  // Combine inventory entries with items to get type, unit, and imageUrl
  // Also deduplicate entries by entry.id to prevent duplicate key errors
  const enrichedInventory = useMemo(() => {
    // Use Map to deduplicate by entry.id (keeps only the first occurrence)
    const uniqueEntriesMap = new Map<string, InventoryEntry>();
    inventoryEntries.forEach((entry) => {
      if (!uniqueEntriesMap.has(entry.id)) {
        uniqueEntriesMap.set(entry.id, entry);
      }
    });
    
    // Convert map values back to array and enrich with item data
    return Array.from(uniqueEntriesMap.values()).map((entry) => {
      const item = items.find((i) => i.id === entry.itemId);
      return {
        entry,
        item,
        type: item?.type || 'consumable' as ItemType,
        unit: item?.unit || 'piece',
        imageUrl: item?.imageUrl,
      };
    });
  }, [inventoryEntries, items]);
  
  // Filter inventory by search query
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) {
      return enrichedInventory;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return enrichedInventory.filter(({ entry }) =>
      entry.itemName.toLowerCase().includes(query) ||
      entry.itemSku.toLowerCase().includes(query)
    );
  }, [enrichedInventory, searchQuery]);
  
  // Get other sites (excluding current site)
  const otherSites = useMemo(() => {
    if (!currentSite) return sites;
    return sites.filter((site) => site.id !== currentSite.id && site.status === 'active');
  }, [sites, currentSite]);
  
  // Navigation handlers
  const handleNavigateToOtherSite = useCallback((siteId: string) => {
    navigation.navigate('OtherSiteInventory', { siteId });
  }, [navigation]);
  
  const handleNewRequest = useCallback(() => {
    // Placeholder for New Request action
    console.log('New Request pressed');
  }, []);
  
  const handleReturnItems = useCallback(() => {
    // Placeholder for Return Items action
    console.log('Return Items pressed');
  }, []);
  
  // Loading state
  if (isLoadingSite || sitesLoading) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="My Inventory" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading site information...</Text>
        </View>
      </ScreenLayout>
    );
  }
  
  // No site assigned state
  if (!currentSite) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="My Inventory" />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="construct-outline" size={64} color="#94A3B8" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Site Assigned
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center">
            You haven't been assigned to a site yet. Please contact an administrator.
          </Text>
        </View>
      </ScreenLayout>
    );
  }
  
  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title={`My Inventory – ${currentSite.name}`} />
      
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View className="px-4 pt-4 pb-3">
          <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              className="flex-1 ml-3 text-[15px] text-[#0F172A]"
              placeholder="Search items by name or SKU..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search inventory items"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className="w-8 h-8 items-center justify-center"
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Action Buttons */}
        <View className="px-4 pb-4 flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center flex-row"
            onPress={handleNewRequest}
            activeOpacity={0.7}
            accessibilityLabel="Create new request"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text className="text-[15px] font-semibold text-white ml-2">New Request</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center flex-row"
            onPress={handleReturnItems}
            activeOpacity={0.7}
            accessibilityLabel="Return items"
            accessibilityRole="button"
          >
            <Ionicons name="return-down-back-outline" size={20} color="#1E40AF" />
            <Text className="text-[15px] font-semibold text-[#1E40AF] ml-2">Return Items</Text>
          </TouchableOpacity>
        </View>
        
        {/* Inventory List */}
        <View className="px-4">
          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-[15px] text-[#64748B] mt-4">Loading inventory...</Text>
            </View>
          ) : filteredInventory.length === 0 ? (
            <View className="py-12 items-center">
              <Ionicons name="cube-outline" size={64} color="#94A3B8" />
              <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
                {searchQuery ? 'No Items Found' : 'No Inventory Items'}
              </Text>
              <Text className="text-[15px] text-[#64748B] text-center">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Your site inventory will appear here once items are added'}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {filteredInventory.map(({ entry, type, unit, imageUrl }) => (
                <InventoryListItem
                  key={entry.id}
                  entry={entry}
                  type={type}
                  unit={unit}
                  imageUrl={imageUrl}
                  onPress={() => {
                    // Navigate to item detail screen (to be implemented)
                    console.log('Item pressed:', entry.id);
                  }}
                />
              ))}
            </View>
          )}
        </View>
        
        {/* View Other Sites Section */}
        {otherSites.length > 0 && (
          <View className="px-4 mt-6">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
              View Other Sites
            </Text>
            <View className="gap-3">
              {otherSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] flex-row items-center justify-between"
                  onPress={() => handleNavigateToOtherSite(site.id)}
                  activeOpacity={0.7}
                  accessibilityLabel={`View inventory for ${site.name}`}
                  accessibilityRole="button"
                >
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-[#0F172A] mb-1">
                      {site.name}
                    </Text>
                    {site.address && (
                      <Text className="text-[13px] text-[#64748B]" numberOfLines={1}>
                        {site.address}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};
