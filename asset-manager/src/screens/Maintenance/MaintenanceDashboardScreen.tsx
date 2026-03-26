import React, { useState, useEffect, useCallback } from 'react';
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
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import MaintenanceCard from '../../components/Maintenance/MaintenanceCard';
import { subscribeToMaintenance } from '../../services/firebase/maintenanceService';
import {
  setMaintenanceRecords,
  setLoading,
} from '../../store/slices/maintenanceSlice';
import {
  selectActiveMaintenanceRecords,
  selectMaintenanceHistory,
  selectMaintenanceLoading,
  selectWrittenOffRegisterRecords,
} from '../../store/selectors/maintenanceSelectors';
import { saveCsvAndShare } from '../../utils/csvExport';
import { buildWrittenOffRegisterCsv } from '../../utils/writtenOffRegisterCsv';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { Maintenance } from '../../types/maintenance';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceStackParamList';

type TabType = 'active' | 'history' | 'writtenOff';

type NavigationProp = StackNavigationProp<MaintenanceStackParamList, 'MaintenanceDashboard'>;

export const MaintenanceDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [refreshing, setRefreshing] = useState(false);
  
  const activeRecords = useAppSelector(selectActiveMaintenanceRecords);
  const historyRecords = useAppSelector(selectMaintenanceHistory);
  const writtenOffRegisterRecords = useAppSelector(selectWrittenOffRegisterRecords);
  const loading = useAppSelector(selectMaintenanceLoading);

  const displayedRecords =
    activeTab === 'active'
      ? activeRecords
      : activeTab === 'history'
        ? historyRecords
        : writtenOffRegisterRecords;
  const hasNoData =
    activeRecords.length === 0 &&
    historyRecords.length === 0 &&
    writtenOffRegisterRecords.length === 0;

  // Set up real-time subscription
  useEffect(() => {
    dispatch(setLoading(true));
    const unsubscribe = subscribeToMaintenance((records) => {
      dispatch(setMaintenanceRecords(records));
    });
    
    return () => {
      unsubscribe();
    };
  }, [dispatch]);
  
  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
    // Just wait a moment for user feedback
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);
  
  // Navigate back to Central Store Inventory
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  
  // Navigate to add screen
  const handleAddToMaintenance = useCallback(() => {
    navigation.navigate('AddToMaintenance');
  }, [navigation]);
  
  // Navigate to detail screen
  const handleCardPress = useCallback((maintenance: Maintenance) => {
    navigation.navigate('MaintenanceDetail', { maintenanceId: maintenance.id });
  }, [navigation]);

  const handleExportCsv = useCallback(async () => {
    try {
      const csv = buildWrittenOffRegisterCsv(writtenOffRegisterRecords);
      await saveCsvAndShare(csv, 'written-off-register');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to export CSV';
      Alert.alert('Export failed', msg);
    }
  }, [writtenOffRegisterRecords]);
  
  // Full-screen initial loader: show when loading and no data yet (prevents page flash)
  if (loading && hasNoData) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Maintenance"
          showBack
          onBackPress={handleBack}
          rightAction={{
            icon: 'add',
            onPress: handleAddToMaintenance,
            accessibilityLabel: 'Add to maintenance',
          }}
        />
        <View
          className="flex-1 items-center justify-center px-4"
          accessibilityLabel="Loading maintenance records"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading...</Text>
        </View>
      </ScreenLayout>
    );
  }

  // Render tab button
  const renderTabButton = (tab: TabType, label: string, count: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        className={`flex-1 py-3 border-b-2 ${
          isActive ? 'border-[#1E40AF]' : 'border-transparent'
        }`}
        onPress={() => setActiveTab(tab)}
        accessibilityLabel={`${label} tab`}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <Text
          className={`text-[15px] font-semibold text-center ${
            isActive ? 'text-[#1E40AF]' : 'text-[#64748B]'
          }`}
        >
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Render empty state
  const renderEmptyState = () => {
    if (loading && displayedRecords.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-4 py-12">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading maintenance records...
          </Text>
        </View>
      );
    }
    
    if (activeTab === 'active') {
      return (
        <View className="flex-1 items-center justify-center px-4 py-12">
          <Ionicons name="build-outline" size={80} color="#94A3B8" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Active Maintenance
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center mb-6">
            Items sent for repair or maintenance will appear here
          </Text>
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center"
            onPress={handleAddToMaintenance}
            activeOpacity={0.7}
          >
            <Text className="text-[15px] font-semibold text-white">
              Add to Maintenance
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (activeTab === 'history') {
      return (
        <View className="flex-1 items-center justify-center px-4 py-12">
          <Ionicons name="file-tray-outline" size={80} color="#94A3B8" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Maintenance History
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center">
            Completed maintenance records will appear here
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-4 py-12">
        <Ionicons name="document-text-outline" size={80} color="#94A3B8" />
        <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
          No Written-Off Records
        </Text>
        <Text className="text-[15px] text-[#64748B] text-center">
          Items permanently written off from maintenance appear here for your disposal register.
        </Text>
      </View>
    );
  };
  
  // Render maintenance card
  const renderMaintenanceCard = ({ item }: { item: Maintenance }) => (
    <MaintenanceCard maintenance={item} onPress={() => handleCardPress(item)} />
  );
  
  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Maintenance"
        showBack
        onBackPress={handleBack}
        rightAction={{
          icon: 'add',
          onPress: handleAddToMaintenance,
          accessibilityLabel: 'Add to maintenance',
        }}
      />

      {/* Info note */}
      <View className="bg-[#E0F2FE] px-4 py-2.5 border-b border-[#0EA5E9]/20">
        <Text className="text-[13px] text-[#0369A1] text-center w-full">
          Only Non Consumable items can be added to maintenance.
        </Text>
      </View>
      
      {/* Tab Bar — min ~48px touch height */}
      <View className="bg-white border-b border-[#E2E8F0] flex-row">
        {renderTabButton('active', 'Active', activeRecords.length)}
        {renderTabButton('history', 'History', historyRecords.length)}
        {renderTabButton('writtenOff', 'Written off', writtenOffRegisterRecords.length)}
      </View>

      {activeTab === 'writtenOff' && writtenOffRegisterRecords.length > 0 ? (
        <View className="border-b border-[#E2E8F0] bg-white px-4 py-3">
          <TouchableOpacity
            className="min-h-12 items-center justify-center rounded-[10px] border-[1.5px] border-[#1E40AF] px-4 py-3"
            onPress={handleExportCsv}
            accessibilityRole="button"
            accessibilityLabel="Export written-off register as CSV"
            activeOpacity={0.7}
          >
            <Text className="text-[15px] font-semibold text-[#1E40AF]">Export register as CSV</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      
      {/* Content */}
      {displayedRecords.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={displayedRecords}
          keyExtractor={(item) => item.id}
          renderItem={renderMaintenanceCard}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#1E40AF']}
              tintColor="#1E40AF"
            />
          }
        />
      )}
    </ScreenLayout>
  );
};
