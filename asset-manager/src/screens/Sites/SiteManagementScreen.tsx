import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, ScreenLayout, SiteCard } from '../../components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSites, setSearchQuery, setSites } from '../../store/slices/sitesSlice';
import {
  selectFilteredActiveSites,
  selectFilteredInactiveSites,
  selectSitesLoading,
  selectSitesError,
  selectSearchQuery,
} from '../../store/selectors/sitesSelectors';
import { subscribeToSites } from '../../services/firebase/siteService';
import type { Site } from '../../types/sites';

export const SiteManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const activeSites = useAppSelector(selectFilteredActiveSites);
  const inactiveSites = useAppSelector(selectFilteredInactiveSites);
  const isLoading = useAppSelector(selectSitesLoading);
  const error = useAppSelector(selectSitesError);
  const searchQuery = useAppSelector(selectSearchQuery);

  // Set up real-time listener for sites
  useEffect(() => {
    // Initial fetch
    dispatch(fetchSites());

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSites((sites: Site[]) => {
      dispatch(setSites(sites));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchSites()).finally(() => {
      setRefreshing(false);
    });
  }, [dispatch]);

  const handleAddSite = useCallback(() => {
    // @ts-ignore - navigation typing varies by navigator
    navigation.navigate('AddSite');
  }, [navigation]);

  const handleSitePress = useCallback(
    (site: Site) => {
      // @ts-ignore - navigation typing varies by navigator
      navigation.navigate('EditSite', { siteId: site.id });
    },
    [navigation]
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      dispatch(setSearchQuery(text));
    },
    [dispatch]
  );

  const renderSiteCard = useCallback(
    ({ item }: { item: Site }) => (
      <SiteCard site={item} onPress={() => handleSitePress(item)} />
    ),
    [handleSitePress]
  );

  const renderSection = useCallback(
    (title: string, sites: Site[], showExpand: boolean = false) => {
      if (sites.length === 0) return null;

      const sectionPrefix = title.toLowerCase().replace(/\s+/g, '-');

      return (
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3 px-4">
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              {title} ({sites.length})
            </Text>
            {showExpand && sites.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Expand inactive sites"
              >
                <Ionicons name="chevron-forward" size={18} color="#1E40AF" />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={sites}
            renderItem={renderSiteCard}
            keyExtractor={(item) => `${sectionPrefix}-${item.id}`}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      );
    },
    [renderSiteCard]
  );

  // Loading state
  if (isLoading && activeSites.length === 0 && inactiveSites.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Site Management"
          rightAction={{
            icon: 'add-circle',
            onPress: handleAddSite,
            accessibilityLabel: 'Add new site',
          }}
        />
        <View
          className="flex-1 items-center justify-center px-4"
          accessibilityLabel="Loading sites"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading sites...</Text>
        </View>
      </ScreenLayout>
    );
  }

  // Error state (only if no sites loaded)
  if (error && activeSites.length === 0 && inactiveSites.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Site Management"
          rightAction={{
            icon: 'add-circle',
            onPress: handleAddSite,
            accessibilityLabel: 'Add new site',
          }}
        />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle" size={80} color="#DC2626" />
          <Text className="text-[22px] font-semibold text-[#0F172A] mb-2 mt-4">Error</Text>
          <Text className="text-[15px] text-[#DC2626] mb-4 text-center">{error}</Text>
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center flex-row gap-2"
            onPress={handleRefresh}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Retry loading sites"
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  // Empty state
  const hasNoSites = activeSites.length === 0 && inactiveSites.length === 0 && !isLoading;

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Site Management"
        rightAction={{
          icon: 'add-circle',
          onPress: handleAddSite,
          accessibilityLabel: 'Add new site',
        }}
      />

      {/* Search Bar */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <View className="relative">
          <View className="absolute left-4 top-0 h-12 items-center justify-center z-10">
            <Ionicons name="search" size={24} color="#94A3B8" />
          </View>
          <TextInput
            className="border border-[#E2E8F0] rounded-lg h-12 pl-12 pr-4 bg-white text-[15px] text-[#0F172A]"
            placeholder="Search sites..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            accessibilityLabel="Search sites"
            accessibilityRole="search"
          />
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View className="bg-[#D97706]/15 px-4 py-2 mx-4 mt-3 rounded-lg flex-row items-center gap-2">
            <Ionicons name="warning" size={24} color="#D97706" />
          <Text className="text-[13px] text-[#D97706] flex-1">{error}</Text>
        </View>
      )}

      {/* Content */}
      {hasNoSites ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="business" size={80} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Sites Found
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center mb-6">
            {searchQuery
              ? 'No sites match your search. Try a different search term.'
              : 'Get started by creating your first site.'}
          </Text>
            <TouchableOpacity
              className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center flex-row gap-2"
              onPress={handleAddSite}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add new site"
            >
              <Ionicons name="add-circle" size={22} color="#FFFFFF" />
              <Text className="text-[15px] font-semibold text-white">Add Site</Text>
            </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#1E40AF']}
              tintColor="#1E40AF"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {activeSites.length === 0 && inactiveSites.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Text className="text-[15px] text-[#64748B]">
                {searchQuery ? 'No sites match your search' : 'No sites found'}
              </Text>
            </View>
          ) : (
            <>
              {renderSection('ACTIVE SITES', activeSites)}
              {renderSection('INACTIVE SITES', inactiveSites)}
            </>
          )}
        </ScrollView>
      )}
    </ScreenLayout>
  );
};
