import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ManagerReassignmentConfirmationModalProps {
  visible: boolean;
  managerName: string;
  siteName: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: React.ReactNode;
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
  accessibilityLabel?: string;
}

export const ManagerReassignmentConfirmationModal: React.FC<
  ManagerReassignmentConfirmationModalProps
> = ({
  visible,
  managerName,
  siteName,
  onConfirm,
  onCancel,
  title = 'Manager Already Assigned',
  message,
  confirmButtonLabel = 'Move Manager',
  cancelButtonLabel = 'Cancel',
  accessibilityLabel = 'Confirm manager reassignment',
}) => {
  const defaultMessage = (
    <>
      <Text className="font-semibold text-[#0F172A]">{managerName}</Text>
      {' is already assigned to '}
      <Text className="font-semibold text-[#0F172A]">{siteName}</Text>
      {'. Do you want to move them to this site?'}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View
          className="bg-white rounded-2xl p-6 w-full max-w-sm"
          accessibilityRole="alert"
          accessibilityLabel={accessibilityLabel}
        >
          <View className="items-center mb-4">
            <Ionicons name="alert-circle" size={64} color="#D97706" />
          </View>

          <Text className="text-[20px] font-semibold text-[#0F172A] mb-3 text-center">
            {title}
          </Text>

          <Text className="text-[15px] text-[#64748B] mb-6 text-center leading-6">
            {message || defaultMessage}
          </Text>

          <View className="gap-3">
            <TouchableOpacity
              className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
              onPress={onConfirm}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={confirmButtonLabel}
            >
              <Text className="text-[15px] font-semibold text-white">{confirmButtonLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="border-[1.5px] border-[#64748B] rounded-[10px] h-[50px] items-center justify-center"
              onPress={onCancel}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={cancelButtonLabel}
            >
              <Text className="text-[15px] font-semibold text-[#64748B]">{cancelButtonLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
