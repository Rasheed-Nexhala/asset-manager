import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormField } from './FormField';
import { reauthenticateAndUpdatePassword } from '../services/firebase/authService';

export interface UpdatePasswordFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const UpdatePasswordForm: React.FC<UpdatePasswordFormProps> = ({
  onSuccess,
  onError,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentPasswordError, setCurrentPasswordError] = useState<string | undefined>();
  const [newPasswordError, setNewPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>();

  const validateForm = (): boolean => {
    let isValid = true;

    setCurrentPasswordError(undefined);
    setNewPasswordError(undefined);
    setConfirmPasswordError(undefined);

    if (!currentPassword.trim()) {
      setCurrentPasswordError('Current password is required');
      isValid = false;
    }

    if (!newPassword.trim()) {
      setNewPasswordError('New password is required');
      isValid = false;
    } else if (newPassword.length < 6) {
      setNewPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else if (newPassword === currentPassword) {
      setNewPasswordError('New password must be different from current password');
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your new password');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords don't match");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async () => {
    setError(null);
    setShowSuccess(false);
    setCurrentPasswordError(undefined);
    setNewPasswordError(undefined);
    setConfirmPasswordError(undefined);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await reauthenticateAndUpdatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setShowSuccess(true);
      onSuccess?.();
    } catch (error: any) {
      const errorMessage =
        error.message || 'Failed to update password. Please try again.';
      setError(errorMessage);
      onError?.(errorMessage);

      if (error.code === 'auth/wrong-password' || error.message?.includes('password')) {
        setCurrentPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setNewPasswordError('Password must be at least 6 characters');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="gap-4">
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
        accessibilityLabel="Current password input"
        rightIcon={
          <Ionicons
            name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#64748B"
          />
        }
        onRightIconPress={() => setShowCurrentPassword(!showCurrentPassword)}
      />

      <FormField
        label="New Password"
        required
        value={newPassword}
        onChangeText={(text) => {
          setNewPassword(text);
          if (newPasswordError) setNewPasswordError(undefined);
          if (confirmPassword && text === confirmPassword && confirmPasswordError) {
            setConfirmPasswordError(undefined);
          }
        }}
        placeholder="Enter your new password"
        secureTextEntry={!showNewPassword}
        error={newPasswordError}
        accessibilityLabel="New password input"
        rightIcon={
          <Ionicons
            name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#64748B"
          />
        }
        onRightIconPress={() => setShowNewPassword(!showNewPassword)}
      />

      <FormField
        label="Confirm New Password"
        required
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          if (confirmPasswordError) setConfirmPasswordError(undefined);
        }}
        placeholder="Confirm your new password"
        secureTextEntry={!showConfirmPassword}
        error={confirmPasswordError}
        accessibilityLabel="Confirm new password input"
        rightIcon={
          <Ionicons
            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#64748B"
          />
        }
        onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
      />

      {showSuccess ? (
        <View
          className="bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg p-3"
          accessibilityLiveRegion="polite"
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-lg">✅</Text>
            <Text className="text-[13px] text-[#16A34A] flex-1">
              Password updated successfully
            </Text>
          </View>
        </View>
      ) : null}

      {error ? (
        <View
          className="bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-lg p-3"
          accessibilityLiveRegion="polite"
        >
          <Text className="text-[13px] text-[#DC2626]">{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        className={`bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center ${
          isLoading ? 'opacity-70' : ''
        }`}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Update password"
        accessibilityState={{ disabled: isLoading }}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text className="text-[15px] font-semibold text-white">
            Update Password
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
