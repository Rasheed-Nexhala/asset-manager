import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormField } from './FormField';
import { useAppDispatch } from '../store/hooks';
import { deleteAccountUser } from '../store/slices/authSlice';

export interface DeleteAccountFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * DeleteAccountForm — Form for account deletion (Guideline 5.1.1(v)).
 *
 * Flow:
 * 1. User enters current password
 * 2. User taps "Delete Account"
 * 3. Alert.alert confirmation (destructive style)
 * 4. On confirm: re-auth → delete Firestore doc → delete Auth user → clear state
 *
 * Follows same pattern as UpdatePasswordForm (password field, loading, error display).
 */
export const DeleteAccountForm: React.FC<DeleteAccountFormProps> = ({
  onSuccess,
  onError,
}) => {
  const dispatch = useAppDispatch();
  const [currentPassword, setCurrentPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | undefined
  >();

  const validateForm = (): boolean => {
    setCurrentPasswordError(undefined);
    if (!currentPassword.trim()) {
      setCurrentPasswordError('Current password is required');
      return false;
    }
    return true;
  };

  const handleDeleteAccount = async () => {
    setError(null);
    setCurrentPasswordError(undefined);

    if (!validateForm()) {
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone. All your data will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await dispatch(deleteAccountUser(currentPassword)).unwrap();
              onSuccess?.();
            } catch (err: any) {
              const errorMessage =
                err?.message || 'Account deletion failed. Please try again.';
              setError(errorMessage);
              onError?.(errorMessage);

              if (
                err?.code === 'auth/wrong-password' ||
                err?.message?.includes('password')
              ) {
                setCurrentPasswordError('Current password is incorrect');
              }
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="gap-4">
      <Text className="text-[15px] text-[#64748B] mb-1">
        Enter your current password to confirm account deletion. This action
        cannot be undone.
      </Text>

      <FormField
        label="Current Password"
        required
        value={currentPassword}
        onChangeText={(text) => {
          setCurrentPassword(text);
          if (currentPasswordError) setCurrentPasswordError(undefined);
        }}
        placeholder="Enter your current password"
        secureTextEntry={!showCurrentPassword}
        error={currentPasswordError}
        accessibilityLabel="Current password input for account deletion"
        rightIcon={
          <Ionicons
            name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#64748B"
          />
        }
        onRightIconPress={() => setShowCurrentPassword(!showCurrentPassword)}
      />

      {error ? (
        <View
          className="bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-lg p-3"
          accessibilityLiveRegion="polite"
        >
          <Text className="text-[13px] text-[#DC2626]">{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        className={`rounded-[10px] h-[50px] items-center justify-center flex-row gap-2 ${
          isLoading ? 'bg-[#DC2626]/70' : 'bg-[#DC2626]'
        }`}
        onPress={handleDeleteAccount}
        disabled={isLoading}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={
          isLoading ? 'Deleting account, please wait' : 'Delete account'
        }
        accessibilityState={{ disabled: isLoading, busy: isLoading }}
      >
        {isLoading ? (
          <>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text className="text-[15px] font-semibold text-white">
              Please wait…
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">
              Delete Account
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
