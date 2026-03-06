import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { ScreenLayout } from '../../components';

/**
 * AuthCheckingScreen - Shown while Firebase restores persisted auth state
 *
 * Prevents the login screen from flashing when the user has a valid session.
 * Uses CIAMS design system: primary blue spinner, semantic typography, app background.
 */
export const AuthCheckingScreen: React.FC = () => {
  return (
    <ScreenLayout edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-4">
        <ActivityIndicator
          size="large"
          color="#1E40AF"
          testID="auth-checking-indicator"
        />
        <Text className="text-[17px] font-semibold text-[#0F172A] mt-4">
          Checking session...
        </Text>
        <Text className="text-[13px] text-[#64748B] mt-2 text-center">
          Restoring your session
        </Text>
      </View>
    </ScreenLayout>
  );
};
