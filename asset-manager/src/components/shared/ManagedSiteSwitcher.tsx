import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Site } from '../../types/sites';

export interface ManagedSiteSwitcherProps {
  managedSites: Site[];
  activeSiteId: string | null;
  onSiteChange: (siteId: string) => void;
}

/**
 * Site Manager context: shows current site; switcher only when managing 2+ active sites (CIAMS).
 */
export function ManagedSiteSwitcher({
  managedSites,
  activeSiteId,
  onSiteChange,
}: ManagedSiteSwitcherProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const active =
    managedSites.find((s) => s.id === activeSiteId) ?? managedSites[0] ?? null;

  const handlePick = useCallback(
    (siteId: string) => {
      onSiteChange(siteId);
      setModalVisible(false);
    },
    [onSiteChange]
  );

  if (managedSites.length === 0 || !active) {
    return null;
  }

  if (managedSites.length === 1) {
    return (
      <View className="mb-3 flex-row items-center">
        <View className="rounded-full bg-[#B45309]/15 px-3 py-1.5 max-w-full">
          <Text
            className="text-[12px] font-medium text-[#B45309]"
            numberOfLines={1}
            accessibilityRole="text"
          >
            {active.name}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-3">
      <TouchableOpacity
        className="min-h-[48px] flex-row items-center justify-between rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2"
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Active site ${active.name}. Double tap to switch site.`}
      >
        <View className="flex-1 min-w-0 pr-2">
          <Text className="text-[13px] text-[#64748B]">Working site</Text>
          <Text className="text-[15px] font-semibold text-[#0F172A]" numberOfLines={1}>
            {active.name}
          </Text>
        </View>
        <View className="rounded-full bg-[#B45309]/15 px-2 py-1">
          <Text className="text-[12px] font-medium text-[#B45309]">Switch</Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#64748B" style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        accessibilityViewIsModal
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            className="max-h-[70%] rounded-t-2xl bg-white p-4"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-[#E2E8F0]" />
            <Text className="mb-3 text-[17px] font-semibold text-[#0F172A]">
              Select working site
            </Text>
            <ScrollView className="max-h-80" keyboardShouldPersistTaps="handled">
              {managedSites.map((site) => {
                const selected = site.id === activeSiteId;
                return (
                  <TouchableOpacity
                    key={site.id}
                    className={`mb-2 min-h-[48px] flex-row items-center justify-between rounded-lg border px-4 py-3 ${
                      selected ? 'border-[#1E40AF] bg-[#1E40AF]/10' : 'border-[#E2E8F0] bg-white'
                    }`}
                    onPress={() => handlePick(site.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <View className="flex-1 min-w-0">
                      <Text
                        className={`text-[15px] font-medium ${
                          selected ? 'text-[#1E40AF]' : 'text-[#0F172A]'
                        }`}
                        numberOfLines={2}
                      >
                        {site.name}
                      </Text>
                      {site.address ? (
                        <Text className="text-[13px] text-[#64748B]" numberOfLines={1}>
                          {site.address}
                        </Text>
                      ) : null}
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color="#1E40AF" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              className="mt-2 min-h-[48px] items-center justify-center rounded-[10px] border-[1.5px] border-[#1E40AF]"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-[15px] font-semibold text-[#1E40AF]">Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
