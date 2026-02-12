import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AvailabilityIndicatorProps {
  requested: number;
  available: number;
  sufficient: boolean;
}

export const AvailabilityIndicator: React.FC<AvailabilityIndicatorProps> = ({
  requested,
  available,
  sufficient,
}) => {
  return (
    <View
      className={`p-2 rounded-lg ${
        sufficient ? 'bg-[#16A34A]/10' : 'bg-[#DC2626]/10'
      }`}
    >
      <View className="flex-row items-center gap-2">
        <Ionicons
          name={sufficient ? 'checkmark-circle' : 'alert-circle'}
          size={16}
          color={sufficient ? '#16A34A' : '#DC2626'}
        />
        <Text
          className={`text-[13px] font-medium ${
            sufficient ? 'text-[#16A34A]' : 'text-[#DC2626]'
          }`}
        >
          {sufficient ? 'Sufficient' : 'Insufficient'}
        </Text>
      </View>
      <Text className="text-[13px] text-[#64748B] mt-1">
        Requested: {requested} • Available: {available}
      </Text>
    </View>
  );
};
