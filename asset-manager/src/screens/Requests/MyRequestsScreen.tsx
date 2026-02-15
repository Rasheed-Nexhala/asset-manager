import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { RequestCard } from '../../components/Requests/RequestCard';
import { requestService } from '../../services/firebase/requestService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setMyRequests } from '../../store/slices/requestsSlice';
import {
  selectMyRequestsByStatus,
  selectRequestsLoading,
} from '../../store/selectors/requestSelectors';
import {
  selectUserId,
  selectIsSiteManager,
} from '../../store/selectors/authSelectors';
import { selectAllSites } from '../../store/selectors/sitesSelectors';
import type { Request } from '../../types/request';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type NavigationProp = StackNavigationProp<RequestStackParamList, 'MyRequests'>;

type TabKey = 'all' | 'pending' | 'approved' | 'rejected' | 'transferred' | 'partially_returned' | 'returned';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'transferred', label: 'Transferred' },
  { key: 'partially_returned', label: 'Partially Returned' },
  { key: 'returned', label: 'Returned' },
];

export const MyRequestsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = useAppSelector(selectUserId);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const sites = useAppSelector(selectAllSites);
  const filteredRequests = useAppSelector(
    selectMyRequestsByStatus(activeTab === 'all' ? 'all' : activeTab)
  );
  const isLoading = useAppSelector(selectRequestsLoading);

  const currentSite = useMemo(() => {
    if (!userId || sites.length === 0) return null;
    return sites.find((site) => site.managerId === userId) || null;
  }, [userId, sites]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = requestService.subscribeToRequests(
      { userId },
      (requests) => {
        dispatch(setMyRequests(requests));
      }
    );
    return unsubscribe;
  }, [dispatch, userId]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null;
      setRefreshing(false);
    }, 800);
  }, []);

  const handleCreateRequest = useCallback(() => {
    if (!currentSite) {
      return;
    }
    navigation.navigate('CreateRequest', { siteId: currentSite.id });
  }, [navigation, currentSite]);

  const handleRequestPress = useCallback(
    (request: Request) => {
      if (request.status === 'draft') {
        navigation.navigate('EditRequest', { requestId: request.id });
      } else {
        navigation.navigate('ProcessRequest', { requestId: request.id });
      }
    },
    [navigation]
  );

  const renderRequestCard = useCallback(
    ({ item }: { item: Request }) => (
      <View className="px-4 pb-3">
        <RequestCard
          request={item}
          onPress={() => handleRequestPress(item)}
          showAvailability={false}
        />
      </View>
    ),
    [handleRequestPress]
  );

  const renderTab = useCallback(
    (tab: (typeof TABS)[0]) => (
      <TouchableOpacity
        key={tab.key}
        className={`px-4 py-2 rounded-full border ${
          activeTab === tab.key
            ? 'bg-[#1E40AF] border-[#1E40AF]'
            : 'bg-white border-[#E2E8F0]'
        }`}
        onPress={() => setActiveTab(tab.key)}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityLabel={`${tab.label} tab`}
        accessibilityState={{ selected: activeTab === tab.key }}
      >
        <Text
          className={`text-[13px] font-medium ${
            activeTab === tab.key ? 'text-white' : 'text-[#64748B]'
          }`}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    ),
    [activeTab]
  );

  if (isLoading && filteredRequests.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="My Requests" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading your requests...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="My Requests"
        rightAction={
          isSiteManager && currentSite
            ? {
                icon: 'add-circle',
                onPress: handleCreateRequest,
                accessibilityLabel: 'Create new request',
              }
            : undefined
        }
      />

      {/* Tabs */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {TABS.map(renderTab)}
        </ScrollView>
      </View>

      {filteredRequests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="document-text-outline" size={80} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Requests Yet
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center mb-6">
            {activeTab !== 'all'
              ? `No ${activeTab} requests.`
              : 'Create your first request to get started.'}
          </Text>
          {isSiteManager && currentSite && activeTab === 'all' && (
            <TouchableOpacity
              className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center flex-row gap-2"
              onPress={handleCreateRequest}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Create new request"
            >
              <Ionicons name="add-circle" size={22} color="#FFFFFF" />
              <Text className="text-[15px] font-semibold text-white">
                New Request
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1E40AF"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenLayout>
  );
};
