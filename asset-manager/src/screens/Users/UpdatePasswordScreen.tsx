import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UpdatePasswordForm } from '../../components/UpdatePasswordForm';
import { ScreenLayout } from '../../components';

/**
 * Props for the UpdatePasswordScreen component.
 */
export interface UpdatePasswordScreenProps {
  /** Optional navigation prop for testing purposes */
  navigation?: any;
}

/**
 * UpdatePasswordScreen — Dedicated screen for password updates.
 * 
 * Features:
 * - Clean, focused interface with just password update functionality
 * - Header with back button navigation
 * - Follows CIAMS design system standards
 * - Auto-navigation back to profile after successful update
 * - Accessibility support with proper touch targets (48px minimum)
 * 
 * Usage:
 * - Navigate from ProfileScreen when user wants to update password
 * - Provides focused experience without other profile distractions
 */
export const UpdatePasswordScreen: React.FC<UpdatePasswordScreenProps> = ({
  navigation: navProp,
}) => {
  const navigation = useNavigation();
  const activeNavigation = navProp || navigation;

  /**
   * Handles back button press.
   * Uses navigation.goBack() if available, otherwise logs action.
   */
  const handleBack = useCallback(() => {
    if (activeNavigation && activeNavigation.canGoBack && activeNavigation.canGoBack()) {
      activeNavigation.goBack();
    } else if (activeNavigation && activeNavigation.goBack) {
      activeNavigation.goBack();
    } else {
      console.log('Back navigation requested');
    }
  }, [activeNavigation]);

  /**
   * Handles successful password update.
   * Shows success feedback and navigates back to previous screen.
   */
  const handleSuccess = useCallback(() => {
    console.log('Password updated successfully');
    // Auto-navigate back after successful update
    setTimeout(() => {
      handleBack();
    }, 1500); // Small delay to show success message
  }, [handleBack]);

  /**
   * Handles password update errors.
   * Error display is managed by UpdatePasswordForm component.
   */
  const handleError = useCallback((error: string) => {
    console.error('Password update error:', error);
    // Error is already handled by UpdatePasswordForm
    // This callback can be used for additional error tracking if needed
  }, []);

  return (
    <ScreenLayout edges={['top', 'left', 'right']} keyboardAware>
      {/* Header with Back Button */}
      <View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center justify-between">
        {/* Back Button - 48px touch target */}
        <TouchableOpacity
          onPress={handleBack}
          className="w-11 h-11 items-center justify-center"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back to profile"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        {/* Screen Title */}
        <Text 
          className="text-[22px] font-semibold text-[#0F172A]"
          accessibilityRole="header"
        >
          Update Password
        </Text>

        {/* Right spacer to center title */}
        <View className="w-11 h-11" />
      </View>

      {/* Main Content */}
      <ScrollView 
        className="flex-1"
        contentContainerClassName="px-4 py-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form Card */}
        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
          <UpdatePasswordForm
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};