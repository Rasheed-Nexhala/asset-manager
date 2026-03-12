import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Maintenance, IssueType } from '../../types/maintenance';
import MaintenanceStatusBadge from './MaintenanceStatusBadge';

interface MaintenanceCardProps {
  maintenance: Maintenance;
  onPress: () => void;
}

// Issue type labels (for display)
const issueTypeLabels: Record<IssueType, string> = {
  motor_electrical: 'Motor/Electrical',
  physical_damage: 'Physical Damage',
  wear_and_tear: 'Wear and Tear',
  missing_parts: 'Missing Parts',
  other: 'Other',
};

// Helper: Format date string
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MaintenanceCard({ maintenance, onPress }: MaintenanceCardProps) {
  return (
    <TouchableOpacity
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityLabel={`Maintenance record for ${maintenance.itemName}`}
      accessibilityRole="button"
    >
      {/* Top Row: Item Name + Status */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[15px] font-semibold text-[#0F172A] flex-1 pr-2">
          {maintenance.itemName}
        </Text>
        <MaintenanceStatusBadge status={maintenance.status} />
      </View>
      
      {/* Key-Value Grid */}
      <View className="gap-2 mb-3">
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">SKU</Text>
            <Text className="text-[15px] text-[#0F172A]">{maintenance.itemSku}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">Quantity</Text>
            <Text className="text-[15px] text-[#0F172A]">{maintenance.quantity} Pcs</Text>
          </View>
        </View>
        
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">Issue Type</Text>
            <Text className="text-[15px] text-[#0F172A]">
              {issueTypeLabels[maintenance.issueType] || 'Unknown'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">Added</Text>
            <Text className="text-[15px] text-[#0F172A]">
              {formatDate(maintenance.addedAt)}
            </Text>
          </View>
        </View>
        
        {maintenance.reportedByName && (
          <View>
            <Text className="text-[13px] text-[#64748B]">Reported By</Text>
            <Text className="text-[15px] text-[#0F172A]">{maintenance.reportedByName}</Text>
          </View>
        )}
      </View>
      
      {/* Divider + Footer */}
      <View className="border-t border-[#E2E8F0] pt-2 flex-row justify-between items-center">
        <Text className="text-[13px] text-[#64748B]">
          Added by {maintenance.addedByName}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#64748B" />
      </View>
    </TouchableOpacity>
  );
}
