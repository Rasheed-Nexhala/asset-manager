import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { UpdatePasswordForm } from '../UpdatePasswordForm';

export interface UpdatePasswordSectionProps {
  onPasswordUpdated?: () => void;
}

export const UpdatePasswordSection: React.FC<UpdatePasswordSectionProps> = ({
  onPasswordUpdated,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSuccess = () => {
    setShowSuccess(true);
    setIsExpanded(false);
    onPasswordUpdated?.();

    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setShowSuccess(false);
  };

  return (
    <View
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]"
      accessibilityLabel="Password update section"
    >
      <View className="flex-row justify-between items-center mb-4">
        <Text
          className="text-[17px] font-semibold text-[#0F172A]"
          accessibilityRole="header"
        >
          Update Password
        </Text>
        {isExpanded && (
          <TouchableOpacity
            onPress={handleCancel}
            className="px-3 py-1.5"
            accessibilityRole="button"
            accessibilityLabel="Cancel password update"
          >
            <Text className="text-[15px] text-[#64748B]">Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSuccess ? (
        <View
          className="bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg p-3 mb-4"
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

      {!isExpanded && !showSuccess ? (
        <TouchableOpacity
          className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open password update form"
        >
          <Text className="text-[15px] font-semibold text-[#1E40AF]">
            Update Password
          </Text>
        </TouchableOpacity>
      ) : null}

      {isExpanded ? (
        <UpdatePasswordForm
          onSuccess={handleSuccess}
          onError={(error) => {
            console.error('Password update error:', error);
          }}
        />
      ) : null}
    </View>
  );
};
