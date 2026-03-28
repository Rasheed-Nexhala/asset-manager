import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { VendorCard } from '../../components/PurchaseOrder';
import { subscribeToVendors } from '../../services/firebase/vendorService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setVendors } from '../../store/slices/purchaseOrderSlice';
import { selectVendors } from '../../store/selectors/purchaseOrderSelectors';
import type { Vendor } from '../../types/vendor';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';

type NavigationProp = StackNavigationProp<
  PurchaseOrderStackParamList,
  'VendorManagement' | 'VendorLedger'
>;

export const VendorManagementScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const vendors = useAppSelector(selectVendors);

  useEffect(() => {
    const unsub = subscribeToVendors((v) => dispatch(setVendors(v)));
    return unsub;
  }, [dispatch]);

  const filteredVendors = vendors.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.contactPerson ?? '').toLowerCase().includes(q) ||
      (v.phone ?? '').toLowerCase().includes(q) ||
      (v.email ?? '').toLowerCase().includes(q)
    );
  });

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleVendorPress = useCallback(
    (vendor: Vendor) => {
      navigation.navigate('AddVendor', { vendorId: vendor.id });
    },
    [navigation]
  );

  const handleAddVendor = useCallback(() => {
    navigation.navigate('AddVendor', {});
  }, [navigation]);

  const handleLedgerPress = useCallback(
    (vendor: Vendor) => {
      navigation.navigate('VendorLedger', { vendorId: vendor.id });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Vendor }) => (
      <View className="px-4 pb-3">
        <VendorCard
          vendor={item}
          onPress={() => handleVendorPress(item)}
          onLedgerPress={() => handleLedgerPress(item)}
        />
      </View>
    ),
    [handleVendorPress, handleLedgerPress]
  );

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Saved Vendors"
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'add',
          onPress: handleAddVendor,
          accessibilityLabel: 'Add vendor',
        }}
      />

      <View className="px-4 py-3 bg-white border-b border-[#E2E8F0]">
        <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, contact, phone, or email..."
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-3 text-[15px] text-[#0F172A]"
            accessibilityLabel="Search vendors"
            accessibilityRole="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              className="w-12 h-12 items-center justify-center"
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredVendors.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="business-outline" size={80} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Vendors
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center mb-6">
            {searchQuery
              ? 'No vendors match your search.'
              : 'Add vendors to reuse them in purchase orders.'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              onPress={handleAddVendor}
              className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center"
            >
              <Text className="text-[15px] font-semibold text-white">
                Add Vendor
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredVendors}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
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

      <View className="px-4 py-3 bg-white border-t border-[#E2E8F0]">
        <Text className="text-[13px] text-[#64748B] text-center">
          Total Vendors: {filteredVendors.length}
        </Text>
      </View>
    </ScreenLayout>
  );
};
