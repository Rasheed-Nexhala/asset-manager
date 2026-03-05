import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from './layout/ScreenLayout';

interface NoInternetScreenProps {
  onRetry: () => void;
}

/**
 * NoInternetScreen - Full-screen overlay shown when the device has no internet.
 *
 * Displays an icon, message, and retry button. Follows CIAMS design system.
 */
export const NoInternetScreen: React.FC<NoInternetScreenProps> = ({ onRetry }) => {
  return (
    <ScreenLayout edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-4">
        <Ionicons
          name="cloud-offline-outline"
          size={64}
          color="#64748B"
          style={{ marginBottom: 24 }}
          testID="no-internet-icon"
        />
        <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
          No Internet Connection
        </Text>
        <Text className="text-[15px] text-[#64748B] text-center mb-8">
          Please check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={onRetry}
          className="bg-[#1E40AF] rounded-[10px] h-[50px] min-h-[48px] px-8 items-center justify-center"
          activeOpacity={0.8}
          testID="retry-button"
        >
          <Text className="text-[15px] font-semibold text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};
