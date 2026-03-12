import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DeleteAccountForm } from '../../components/DeleteAccountForm';
import { ScreenLayout } from '../../components';

/**
 * Props for the DeleteAccountScreen component.
 */
export interface DeleteAccountScreenProps {
  /** Optional navigation prop for testing purposes */
  navigation?: any;
}

/**
 * DeleteAccountScreen — Dedicated screen for account deletion (Guideline 5.1.1(v)).
 *
 * Features:
 * - Clean, focused interface with password confirmation
 * - Header with back button navigation
 * - Follows CIAMS design system standards
 * - Alert.alert confirmation before deletion (destructive style)
 * - On success: user is signed out and redirected to Auth flow
 *
 * Usage:
 * - Navigate from ProfileScreen when user wants to delete account
 * - Mirrors UpdatePasswordScreen pattern
 */
export const DeleteAccountScreen: React.FC<DeleteAccountScreenProps> = ({
  navigation: navProp,
}) => {
  const navigation = useNavigation();
  const activeNavigation = navProp || navigation;

  const handleBack = useCallback(() => {
    if (
      activeNavigation &&
      activeNavigation.canGoBack &&
      activeNavigation.canGoBack()
    ) {
      activeNavigation.goBack();
    } else if (activeNavigation?.goBack) {
      activeNavigation.goBack();
    } else {
      console.log('Back navigation requested');
    }
  }, [activeNavigation]);

  const handleSuccess = useCallback(() => {
    // User is signed out and RootNavigator switches to Auth screen
    // No need to navigate - auth state change handles it
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('Account deletion error:', error);
  }, []);

  return (
    <ScreenLayout edges={['top', 'left', 'right']} keyboardAware>
      {/* Header with Back Button */}
      <View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={handleBack}
          className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back to profile"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <Text
          className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center"
          accessibilityRole="header"
        >
          Delete Account
        </Text>

        <View className="w-12 h-12" />
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
          <DeleteAccountForm onSuccess={handleSuccess} onError={handleError} />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
