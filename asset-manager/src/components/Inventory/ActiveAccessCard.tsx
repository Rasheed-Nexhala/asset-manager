/**
 * Active Access Card
 *
 * Displays an approved inventory update request with a toggle for Admin to
 * revoke or restore Store Incharge's access. Only shown after request is made.
 * Uses CIAMS design system (card, 48px touch targets, semantic colors).
 */

import React from 'react';
import { View, Text, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InventoryUpdateRequest } from '../../types/inventoryUpdateRequest';

export interface ActiveAccessCardProps {
  request: InventoryUpdateRequest;
  onToggle: (requestId: string, revoke: boolean) => void;
  isToggling?: boolean;
}

function formatExpiry(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export const ActiveAccessCard: React.FC<ActiveAccessCardProps> = ({
  request,
  onToggle,
  isToggling = false,
}) => {
  const accessActive = !request.accessRevoked;

  const handleToggle = () => {
    if (isToggling) return;
    onToggle(request.id, accessActive);
  };

  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
      {/* Top Row: Requester + Status */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-[#0F172A]">
            {request.requestedByName}
          </Text>
          <Text className="text-[13px] text-[#64748B]">{request.requestedByRole}</Text>
        </View>
        <View
          className={`px-2 py-1 rounded-full min-h-[28px] items-center justify-center ${
            accessActive ? 'bg-[#16A34A]/15' : 'bg-[#475569]/15'
          }`}
        >
          <Text
            className={`text-[12px] font-medium ${
              accessActive ? 'text-[#16A34A]' : 'text-[#475569]'
            }`}
          >
            {accessActive ? 'Access Active' : 'Revoked'}
          </Text>
        </View>
      </View>

      {/* Reason */}
      <View className="mb-3">
        <Text className="text-[13px] text-[#64748B] mb-1">Reason</Text>
        <Text className="text-[15px] text-[#0F172A]">{request.reason}</Text>
      </View>

      {/* Expires */}
      {request.accessExpiresAt && (
        <Text className="text-[13px] text-[#64748B] mb-3">
          Expires: {formatExpiry(request.accessExpiresAt)}
        </Text>
      )}

      {/* Toggle Row - Switch for revoke/restore (CIAMS: min 48px touch target via padding) */}
      <View className="pt-3 border-t border-[#E2E8F0] flex-row items-center justify-between">
        <Text className="text-[15px] text-[#0F172A] flex-1">
          {accessActive ? 'Revoke access' : 'Restore access'}
        </Text>
        {isToggling ? (
          <View className="min-w-[48px] min-h-[48px] items-center justify-center">
            <ActivityIndicator size="small" color="#1E40AF" />
          </View>
        ) : (
          <View className="py-2" accessibilityRole="none">
            <Switch
              value={accessActive}
              onValueChange={() => handleToggle()}
              trackColor={{ false: '#E2E8F0', true: '#16A34A' }}
              thumbColor="#FFFFFF"
              disabled={isToggling}
              accessibilityRole="switch"
              accessibilityState={{ checked: accessActive }}
              accessibilityLabel={accessActive ? 'Revoke access' : 'Restore access'}
            />
          </View>
        )}
      </View>
    </View>
  );
};
