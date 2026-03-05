import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isSafeOpenableUrl } from '../../utils/urlUtils';

interface PODocumentCardProps {
  fileName: string;
  fileUrl: string;
  type: 'invoice' | 'other';
}

export const PODocumentCard: React.FC<PODocumentCardProps> = ({
  fileName,
  fileUrl,
  type,
}) => {
  const handlePress = async () => {
    if (!isSafeOpenableUrl(fileUrl)) {
      Alert.alert(
        'Invalid Link',
        'This document link cannot be opened for security reasons.',
      );
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(fileUrl);
      if (canOpen) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Error', 'Unable to open this document.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open document.');
    }
  };

  const typeLabel = type === 'invoice' ? 'Invoice' : 'Document';

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3 flex-row items-center gap-3"
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View ${typeLabel}: ${fileName}`}
    >
      <View className="w-10 h-10 rounded-lg bg-[#1E40AF]/15 items-center justify-center">
        <Ionicons name="document-attach-outline" size={24} color="#1E40AF" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-[15px] font-medium text-[#0F172A]" numberOfLines={1}>
          {fileName}
        </Text>
        <Text className="text-[13px] text-[#64748B] mt-0.5">{typeLabel}</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="text-[15px] font-semibold text-[#1E40AF]">View</Text>
        <Ionicons name="open-outline" size={18} color="#1E40AF" />
      </View>
    </TouchableOpacity>
  );
};
