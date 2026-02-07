import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LoadingScreenProps {
  message?: string;
}

/**
 * LoadingScreen - Displays a loading indicator with an optional message
 * 
 * This screen is shown while critical data (like user role) is being fetched.
 * It provides a smooth user experience by preventing the app from showing
 * incomplete or missing data.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-4">
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text className="text-[15px] text-[#64748B] mt-4">{message}</Text>
      </View>
    </SafeAreaView>
  );
};
