import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActivityLog } from '../../types/activityLog';
import { ACTION_TYPE_CONFIG } from '../../constants/activityLogConfig';

interface ActivityLogDetailModalProps {
  visible: boolean;
  log: ActivityLog | null;
  onClose: () => void;
}

/** Format full timestamp for detail view */
function formatFullTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActivityLogDetailModal({
  visible,
  log,
  onClose,
}: ActivityLogDetailModalProps) {
  if (!log) return null;

  const actionConfig = ACTION_TYPE_CONFIG[log.actionType] ?? {
    label: log.actionType,
    icon: 'document-text-outline',
    category: log.actionCategory,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl max-h-[90%]">
          {/* Handle Bar */}
          <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mt-3 mb-4" />

          {/* Header */}
          <View className="p-4 border-b border-[#E2E8F0] flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1">
              <Ionicons
                name={actionConfig.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color="#1E40AF"
              />
              <Text className="text-[22px] font-semibold text-[#0F172A]">
                {actionConfig.label}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center"
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView className="px-4 py-4">
            {/* Timestamp */}
            <Text className="text-[13px] text-[#64748B] mb-4">
              {formatFullTimestamp(log.timestamp)}
            </Text>

            {/* Action Section */}
            <View className="mb-6">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                Action
              </Text>
              <View className="bg-[#F8FAFC] rounded-[10px] p-4 gap-2">
                <View className="flex-row gap-4">
                  <Text className="text-[13px] text-[#64748B] w-24">Type:</Text>
                  <Text className="text-[15px] text-[#0F172A] flex-1">
                    {log.actionType}
                  </Text>
                </View>
                <View className="flex-row gap-4">
                  <Text className="text-[13px] text-[#64748B] w-24">User:</Text>
                  <Text className="text-[15px] text-[#0F172A] flex-1">
                    {log.userName}
                  </Text>
                </View>
                <View className="flex-row gap-4">
                  <Text className="text-[13px] text-[#64748B] w-24">Role:</Text>
                  <Text className="text-[15px] text-[#0F172A] flex-1">
                    {log.userRole}
                  </Text>
                </View>
                <View className="flex-row gap-4">
                  <Text className="text-[13px] text-[#64748B] w-24">Target:</Text>
                  <Text className="text-[15px] text-[#0F172A] flex-1">
                    {log.targetDisplay}
                  </Text>
                </View>
              </View>
            </View>

            {/* Summary */}
            <View className="mb-6">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                Summary
              </Text>
              <Text className="text-[15px] text-[#0F172A]">{log.summary}</Text>
            </View>

            {/* Details */}
            {log.details && (
              <View className="mb-6">
                <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                  Details
                </Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {log.details}
                </Text>
              </View>
            )}

            {/* Changes */}
            {log.changes && log.changes.length > 0 && (
              <View className="mb-6 gap-2">
                <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                  Changes
                </Text>
                {log.changes.map((change, index) => (
                  <View
                    key={index}
                    className="bg-[#F8FAFC] rounded-[10px] p-4"
                  >
                    <Text className="text-[15px] font-medium text-[#0F172A] mb-2">
                      {change.fieldLabel}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1 bg-[#DC2626]/15 rounded-lg p-2">
                        <Text className="text-[13px] text-[#64748B] mb-1">
                          Before:
                        </Text>
                        <Text className="text-[15px] text-[#DC2626] font-medium">
                          {String(change.oldValue)}
                        </Text>
                      </View>
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#64748B"
                      />
                      <View className="flex-1 bg-[#16A34A]/15 rounded-lg p-2">
                        <Text className="text-[13px] text-[#64748B] mb-1">
                          After:
                        </Text>
                        <Text className="text-[15px] text-[#16A34A] font-medium">
                          {String(change.newValue)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Metadata */}
            {(log.deviceInfo || log.ipAddress || log.appVersion) && (
              <View className="mb-6">
                <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                  Metadata
                </Text>
                <View className="bg-[#F8FAFC] rounded-[10px] p-4 gap-2">
                  {log.deviceInfo && (
                    <View className="flex-row gap-4">
                      <Text className="text-[13px] text-[#64748B] w-24">
                        Device:
                      </Text>
                      <Text className="text-[15px] text-[#0F172A] flex-1">
                        {log.deviceInfo}
                      </Text>
                    </View>
                  )}
                  {log.ipAddress && (
                    <View className="flex-row gap-4">
                      <Text className="text-[13px] text-[#64748B] w-24">
                        IP:
                      </Text>
                      <Text className="text-[15px] text-[#0F172A] flex-1">
                        {log.ipAddress}
                      </Text>
                    </View>
                  )}
                  {log.appVersion && (
                    <View className="flex-row gap-4">
                      <Text className="text-[13px] text-[#64748B] w-24">
                        App Version:
                      </Text>
                      <Text className="text-[15px] text-[#0F172A] flex-1">
                        {log.appVersion}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
