/**
 * Error Boundary Fallback UI
 *
 * CIAMS-styled error screen shown when an Error Boundary catches a render error.
 * Uses design system colors, typography, and touch targets.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * Fallback UI for Error Boundary - CIAMS design system styling.
 * - App background: #F8FAFC
 * - Danger/critical: #DC2626
 * - Primary button: #1E40AF
 * - 48px min touch targets
 */
export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  resetError,
}) => {
  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <View className="flex-1 items-center justify-center px-4">
        {/* Icon - Danger/critical semantic color */}
        <View className="mb-6 rounded-full bg-[#DC2626]/15 p-4">
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color="#DC2626"
            testID="error-boundary-icon"
          />
        </View>

        {/* Title - Screen title typography */}
        <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
          Something went wrong
        </Text>

        {/* Description - Body/caption */}
        <Text className="text-[15px] text-[#64748B] text-center mb-4">
          An unexpected error occurred. Please try again.
        </Text>

        {/* Error details - Collapsible for dev/debug */}
        <View className="w-full max-h-32 mb-6">
          <ScrollView
            className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]"
            showsVerticalScrollIndicator={true}
          >
            <Text className="text-[13px] text-[#64748B] font-medium mb-1.5">
              Error details
            </Text>
            <Text className="text-[13px] text-[#0F172A]" selectable>
              {error?.message ?? 'Unknown error'}
            </Text>
          </ScrollView>
        </View>

        {/* Primary action - Try again */}
        <TouchableOpacity
          onPress={resetError}
          className="bg-[#1E40AF] rounded-[10px] h-[50px] min-h-[48px] px-8 items-center justify-center"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          testID="error-boundary-retry"
        >
          <Text className="text-[15px] font-semibold text-white">Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
