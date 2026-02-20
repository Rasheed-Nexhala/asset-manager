import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Site } from '../../types/sites';

export interface SiteCardProps {
  site: Site;
  onPress?: () => void;
}

export const SiteCard: React.FC<SiteCardProps> = ({ site, onPress }) => {
  const isActive = site.status === 'active';

  return (
    <TouchableOpacity
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Site: ${site.name}. Status: ${site.status}. Manager: ${site.managerName || 'Not Assigned'}`}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-2 flex-row items-center gap-2">
          <Ionicons name="business" size={24} color="#1E40AF" />
          <Text className="text-[15px] font-semibold text-[#0F172A]" numberOfLines={2}>
            {site.name}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${isActive ? 'bg-[#16A34A]/15' : 'bg-[#DC2626]/15'}`}>
          <Text className={`text-[12px] font-medium ${isActive ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-start gap-2">
          <View className="mt-0.5">
            <Ionicons name="person" size={18} color="#64748B" />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B] mb-1">Manager</Text>
            <Text className="text-[15px] text-[#0F172A]">
              {site.managerName || 'Not Assigned'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-start gap-2">
          <View className="mt-0.5">
            <Ionicons name="location" size={18} color="#64748B" />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B] mb-1">Location</Text>
            <Text className="text-[15px] text-[#0F172A]" numberOfLines={2}>
              {site.address}
            </Text>
          </View>
        </View>

        {site.description && (
          <View className="flex-row items-start gap-2">
            <View className="mt-0.5">
              <Ionicons name="document-text" size={18} color="#64748B" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] text-[#64748B] mb-1">Description</Text>
              <Text className="text-[15px] text-[#0F172A]" numberOfLines={2}>
                {site.description}
              </Text>
            </View>
          </View>
        )}

        {site.contactNumber && (
<View className="flex-row items-start gap-2">
          <View className="mt-0.5">
            <Ionicons name="call" size={18} color="#64748B" />
          </View>
          <View className="flex-1">
              <Text className="text-[13px] text-[#64748B] mb-1">Contact</Text>
              <Text className="text-[15px] text-[#0F172A]">{site.contactNumber}</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
