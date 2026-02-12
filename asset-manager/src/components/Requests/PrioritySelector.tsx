import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { RequestPriority } from '../../types/request';

interface PrioritySelectorProps {
  value: RequestPriority;
  onChange: (priority: RequestPriority) => void;
  error?: string;
}

const priorities: Array<{ value: RequestPriority; label: string; color: string; emoji: string }> = [
  { value: 'high', label: 'High', color: '#DC2626', emoji: '🔴' },
  { value: 'medium', label: 'Medium', color: '#D97706', emoji: '🟡' },
  { value: 'low', label: 'Low', color: '#16A34A', emoji: '🟢' },
];

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  value,
  onChange,
  error,
}) => {
  return (
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]">
        Priority <Text className="text-[#DC2626]">*</Text>
      </Text>

      <View className="flex-row gap-3">
        {priorities.map((priority) => {
          const isSelected = value === priority.value;

          return (
            <TouchableOpacity
              key={priority.value}
              onPress={() => onChange(priority.value)}
              className={`flex-1 h-12 rounded-lg border-[1.5px] items-center justify-center ${
                isSelected ? 'bg-white' : 'bg-white border-[#E2E8F0]'
              }`}
              style={isSelected ? { borderColor: priority.color } : undefined}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`Priority: ${priority.label}`}
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">{priority.emoji}</Text>
                <Text
                  style={isSelected ? { color: priority.color } : undefined}
                  className={`text-[15px] font-semibold ${!isSelected ? 'text-[#64748B]' : ''}`}
                >
                  {priority.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && (
        <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
};
