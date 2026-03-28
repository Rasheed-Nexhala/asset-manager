import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUserId } from '../../store/selectors/authSelectors';
import {
  selectAllSites,
  selectSitesLoading,
  selectAssignedSiteIdForUser,
  selectManagedSitesForUser,
} from '../../store/selectors/sitesSelectors';
import { setActiveManagedSiteId } from '../../store/slices/sitesSlice';
import { saveActiveManagedSiteId } from '../../utils/activeManagedSiteStorage';
import { ManagedSiteSwitcher } from '../../components/shared/ManagedSiteSwitcher';
import { selectAllItems, selectInventoryByLocation, selectItemsLoading } from '../../store/selectors/inventorySelectors';
import { setInventoryForLocation } from '../../store/slices/inventorySlice';
import { fetchSites, setSites } from '../../store/slices/sitesSlice';
import { subscribeToSites } from '../../services/firebase/siteService';
import { subscribeInventoryByLocation, getInventoryByLocation } from '../../services/firebase/inventoryService';
import { ScreenLayout, ScreenHeader } from '../../components';
import { InventoryListItem } from '../../components/Inventory';
import { getLocationId } from '../../utils/locationUtils';
import { runNonCriticalTask } from '../../utils/nonCriticalTask';
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
  
  const managedSites = useAppSelector(selectManagedSitesForUser(userId));
  const effectiveSiteId = useAppSelector(selectAssignedSiteIdForUser(userId));

  // Local state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showOtherSitesModal, setShowOtherSitesModal] = useState<boolean>(false);
  
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
  
  const currentSite = useMemo((): Site | null => {
    if (!effectiveSiteId) return null;
    const safeSites = Array.isArray(sites) ? sites : [];
    return safeSites.find((site) => site.id === effectiveSiteId) ?? null;
  }, [sites, effectiveSiteId]);

  const handleWorkingSiteChange = useCallback(
    (siteId: string) => {
      dispatch(setActiveManagedSiteId(siteId));
      if (userId) {
        void saveActiveManagedSiteId(userId, siteId);
      }
    },
    [dispatch, userId]
  );
  
  // Subscribe to real-time inventory updates when site is found
  // Use currentSite.id to avoid re-subscribing when site object reference changes (e.g. from sites array updates)
  const siteId = currentSite?.id ?? null;
  useEffect(() => {
    if (!siteId) return;

    const locationId = getLocationId('site', siteId);
    const unsubscribe = subscribeInventoryByLocation(locationId, (inventory) => {
      dispatch(setInventoryForLocation({ locationId, inventory }));
    });

    return () => unsubscribe();
  }, [siteId, dispatch]);

  // Refresh inventory when screen gains focus (e.g. switching back to tab)
  // Ensures updates from transfers appear immediately when user returns
  useFocusEffect(
    useCallback(() => {
      if (!siteId) return;

      const locationId = getLocationId('site', siteId);
      runNonCriticalTask(
        'my_site_inventory_focus_refresh',
        () => getInventoryByLocation(locationId),
        {
          feature: 'inventory',
          tags: {
            screen: 'my_site_inventory',
          },
        }
      )
        .then((inventory) => {
          if (!inventory) return;
          dispatch(setInventoryForLocation({ locationId, inventory }));
        })
        .catch(() => {
          // runNonCriticalTask handles capture internally; this guard prevents unhandled rejections.
        });
    }, [siteId, dispatch])
  );
  
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
    return Array.from(uniqueEntriesMap.values())
      .filter((entry) => entry.quantity > 0)
      .map((entry) => {
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
    return enrichedInventory.filter(({ entry }) => {
      const itemName = (entry?.itemName ?? '').toLowerCase();
      const itemSku = (entry?.itemSku ?? '').toLowerCase();
      return itemName.includes(query) || itemSku.includes(query);
    });
  }, [enrichedInventory, searchQuery]);
  
  const managedIds = useMemo(
    () => new Set(managedSites.map((s) => s.id)),
    [managedSites]
  );

  const otherSites = useMemo(() => {
    const safeSites = Array.isArray(sites) ? sites : [];
    return safeSites.filter(
      (site) => !managedIds.has(site.id) && site.status === 'active'
    );
  }, [sites, managedIds]);
  
  // Navigation handlers
  const handleNavigateToOtherSite = useCallback(
    (siteId: string) => {
      setShowOtherSitesModal(false);
      navigation.navigate('OtherSiteInventory', { siteId });
    },
    [navigation]
  );

  const handleOpenOtherSitesModal = useCallback(() => {
    setShowOtherSitesModal(true);
  }, []);

  const handleCloseOtherSitesModal = useCallback(() => {
    setShowOtherSitesModal(false);
  }, []);
  
  if (sitesLoading) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="My Inventory" />
        <View
          className="flex-1 items-center justify-center px-4"
          accessibilityLabel="Loading site information"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading site information...</Text>
        </View>
      </ScreenLayout>
    );
  }
  
  if (managedSites.length === 0) {
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
      <ScreenHeader
        title={`My Inventory`}
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={
          otherSites.length > 0
            ? {
                icon: 'business-outline',
                onPress: handleOpenOtherSitesModal,
                accessibilityLabel: 'View inventory at other sites',
              }
            : undefined
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-3">
          <ManagedSiteSwitcher
            managedSites={managedSites}
            activeSiteId={effectiveSiteId}
            onSiteChange={handleWorkingSiteChange}
          />
        </View>

        {/* Site team — compact bar (web uses sidebar); keeps inventory list above the fold */}
        <View className="px-4 pt-3">
          <View className="flex-row rounded-[10px] border border-[#E2E8F0] bg-white overflow-hidden">
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('AllocateItemsToSupervisors', { returnTo: 'inventory' })
              }
              className="flex-1 min-h-[48px] justify-center items-center border-r border-[#E2E8F0] px-2 py-2 active:bg-[#F8FAFC]"
              accessibilityRole="button"
              accessibilityLabel="Split transferred stock to supervisors"
            >
              <Text className="text-[14px] font-semibold text-[#1E40AF] text-center">Split stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('SiteSupervisors')}
              className="flex-1 min-h-[48px] justify-center items-center px-2 py-2 active:bg-[#F8FAFC]"
              accessibilityRole="button"
              accessibilityLabel="Manage site supervisors team list"
            >
              <Text className="text-[14px] font-semibold text-[#B45309] text-center">Team list</Text>
            </TouchableOpacity>
          </View>
        </View>

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

        {/* View Other Sites - Quick Action (above inventory, always visible) */}
        {otherSites.length > 0 && (
          <View className="px-4 pb-4">
            <TouchableOpacity
              className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] flex-row items-center justify-between min-h-[48px]"
              onPress={handleOpenOtherSitesModal}
              activeOpacity={0.7}
              accessibilityLabel="View inventory at other sites"
              accessibilityRole="button"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#1E40AF]/15 items-center justify-center mr-3">
                  <Ionicons name="business-outline" size={22} color="#1E40AF" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-[#0F172A]">
                    View Other Sites
                  </Text>
                  <Text className="text-[13px] text-[#64748B] mt-0.5">
                    Browse inventory at {otherSites.length} other site
                    {otherSites.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Inventory List */}
        <View className="px-4">
          {isLoading ? (
            <View
              className="py-8 items-center justify-center min-h-[120px]"
              accessibilityLabel="Loading site inventory"
              accessibilityState={{ busy: true }}
            >
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
              {filteredInventory.map(({ entry, item, type, unit, imageUrl }) => (
                <InventoryListItem
                  key={entry.id}
                  entry={entry}
                  type={type}
                  unit={unit}
                  imageUrl={imageUrl}
                  weightPerMeter={item?.weightPerMeter}
                  lengthPerPiece={item?.lengthPerPiece ?? entry.lengthPerPiece}
                  onPress={() => {
                    navigation.navigate('ItemDetail', { itemId: entry.itemId });
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Other Sites Selection Modal - CIAMS bottom sheet pattern */}
      <Modal
        visible={showOtherSitesModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseOtherSitesModal}
      >
        <View className="flex-1">
          <TouchableOpacity
            className="absolute inset-0 bg-black/50"
            activeOpacity={1}
            onPress={handleCloseOtherSitesModal}
            accessibilityLabel="Close modal"
            accessibilityRole="button"
          />
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-2xl max-h-[85%]">
            {/* Handle Bar - CIAMS bottom sheet */}
            <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mt-2 mb-4" />

            {/* Header */}
            <View className="px-4 pb-3 border-b border-[#E2E8F0]">
              <View className="flex-row justify-between items-center">
                <Text className="text-[22px] font-semibold text-[#0F172A]">
                  Other Sites
                </Text>
                <TouchableOpacity
                  onPress={handleCloseOtherSitesModal}
                  className="w-12 h-12 items-center justify-center rounded-[10px]"
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text className="text-[13px] text-[#64748B] mt-1">
                View inventory at other sites
              </Text>
            </View>

            {/* Sites List */}
            <FlatList
              data={otherSites}
              keyExtractor={(site) => site.id}
              className="max-h-96"
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item: site }) => (
                <TouchableOpacity
                  className="px-4 py-4 border-b border-[#E2E8F0] flex-row items-center justify-between min-h-[56px]"
                  onPress={() => handleNavigateToOtherSite(site.id)}
                  activeOpacity={0.7}
                  accessibilityLabel={`View inventory for ${site.name}`}
                  accessibilityRole="button"
                >
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-[#0F172A]">
                      {site.name}
                    </Text>
                    {site.address && (
                      <Text className="text-[13px] text-[#64748B] mt-0.5" numberOfLines={1}>
                        {site.address}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
};
