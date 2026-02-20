import React from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ScreenHeader, ScreenLayout, MyRecentActivityWidget } from '../components';
import { useAppSelector } from '../store/hooks';
import { selectIsAdmin } from '../store/selectors/authSelectors';
import type { DashboardStackParamList } from '../navigation/DashboardStackParamList';

type NavigationProp = StackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const isAdmin = useAppSelector(selectIsAdmin);

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Dashboard" />
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* My Recent Activity Widget (All Users) */}
        <MyRecentActivityWidget
          onViewAll={() => navigation.navigate('MyActivity')}
        />

        {/* Admin-only: Full Activity Log Access */}
        {isAdmin && (
          <TouchableOpacity
            className="bg-white rounded-[10px] p-4 mt-3 flex-row items-center justify-between border border-[#E2E8F0]"
            onPress={() => navigation.navigate('ActivityLog')}
            activeOpacity={0.7}
            accessibilityLabel="View full activity log"
            accessibilityRole="button"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="document-text-outline" size={24} color="#1E40AF" />
              <Text className="text-[15px] font-semibold text-[#0F172A]">
                Activity Log
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};
