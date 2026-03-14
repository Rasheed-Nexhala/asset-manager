import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToSiteManagers } from '../../services/firebase/userRoleService';
import { findSiteByManagerId } from '../../services/firebase/siteService';
import { ManagerReassignmentConfirmationModal } from './ManagerReassignmentConfirmationModal';
import type { UserListItem } from '../../types/roles';
import type { Site } from '../../types/sites';

export interface SiteManagerSelectorProps {
  value: string | null;
  onChange: (managerId: string | null) => void;
  excludeSiteId?: string;
  error?: string;
}

export const SiteManagerSelector: React.FC<SiteManagerSelectorProps> = ({
  value,
  onChange,
  excludeSiteId,
  error,
}) => {
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [confirmationVisible, setConfirmationVisible] = useState<boolean>(false);
  const [pendingManagerId, setPendingManagerId] = useState<string | null>(null);
  const [conflictingSite, setConflictingSite] = useState<Site | null>(null);
  const [checkingAssignment, setCheckingAssignment] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeToSiteManagers((managersList) => {
      try {
        const siteManagers = managersList.filter(
          (user) => user.isActive && !user.isDeleted
        );
        setManagers(siteManagers);
        setLoading(false);
      } catch (error) {
        console.error('Error processing managers:', error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSelect = useCallback(
    async (managerId: string | null) => {
      // If selecting "Not Assigned", proceed immediately
      if (managerId === null) {
        onChange(null);
        setModalVisible(false);
        return;
      }

      // If selecting the same manager already assigned, proceed immediately
      if (managerId === value) {
        onChange(managerId);
        setModalVisible(false);
        return;
      }

      // Check if manager is already assigned to another site
      try {
        setCheckingAssignment(true);
        const existingSite = await findSiteByManagerId(managerId, excludeSiteId);
        
        if (existingSite) {
          // Manager is assigned to another site - show confirmation
          setPendingManagerId(managerId);
          setConflictingSite(existingSite);
          setConfirmationVisible(true);
          setModalVisible(false);
        } else {
          // Manager is not assigned elsewhere - proceed immediately
          onChange(managerId);
          setModalVisible(false);
        }
      } catch (error) {
        console.error('Error checking manager assignment:', error);
        // On error, proceed anyway (fail gracefully)
        onChange(managerId);
        setModalVisible(false);
      } finally {
        setCheckingAssignment(false);
      }
    },
    [onChange, value, excludeSiteId]
  );

  const handleConfirmReassignment = useCallback(() => {
    if (pendingManagerId !== null) {
      onChange(pendingManagerId);
    }
    setConfirmationVisible(false);
    setPendingManagerId(null);
    setConflictingSite(null);
  }, [onChange, pendingManagerId]);

  const handleCancelReassignment = useCallback(() => {
    setConfirmationVisible(false);
    setPendingManagerId(null);
    setConflictingSite(null);
  }, []);

  const selectedManager = value
    ? managers.find((m) => m.id === value)
    : null;
  const displayText = selectedManager
    ? selectedManager.displayName || selectedManager.email || 'Unknown'
    : 'Select Manager';

  const pendingManagerName = useMemo(() => {
    if (!pendingManagerId) return 'This manager';
    const manager = managers.find((m) => m.id === pendingManagerId);
    return manager?.displayName || manager?.email || 'This manager';
  }, [pendingManagerId, managers]);

  const hasError = Boolean(error);

  return (
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]">Site Manager (Optional)</Text>
      <TouchableOpacity
        className={`border rounded-lg h-12 px-4 bg-white flex-row items-center justify-between ${
          hasError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
        }`}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Select site manager. Current: ${displayText}`}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#64748B" />
        ) : (
          <Text className={`text-[15px] ${value ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
            {displayText}
          </Text>
        )}
        <Ionicons name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>
      {error ? (
        <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : (
        <View className="flex-row items-center gap-1">
          <Ionicons name="information-circle-outline" size={18} color="#64748B" />
          <Text className="text-[13px] text-[#64748B]">Can be assigned later</Text>
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        accessibilityLabel="Select site manager"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-4">
            <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mb-4" />

            <Text className="text-[22px] font-semibold text-[#0F172A] mb-4">
              Select Site Manager
            </Text>

            <View className="gap-2 max-h-[400px]">
              <TouchableOpacity
                className={`border border-[#E2E8F0] rounded-lg h-12 px-4 flex-row items-center justify-between ${
                  value === null ? 'bg-[#1E40AF]/10 border-[#1E40AF]' : 'bg-white'
                }`}
                onPress={() => handleSelect(null)}
                activeOpacity={0.7}
                accessibilityLabel="Not Assigned"
                accessibilityRole="button"
                accessibilityState={{ selected: value === null }}
              >
                <Text
                  className={`text-[15px] font-medium ${
                    value === null ? 'text-[#1E40AF]' : 'text-[#0F172A]'
                  }`}
                >
                  Not Assigned
                </Text>
                {value === null && <Ionicons name="checkmark" size={20} color="#1E40AF" />}
              </TouchableOpacity>

              {loading || checkingAssignment ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#1E40AF" />
                  <Text className="text-[15px] text-[#64748B] mt-4">
                    {loading ? 'Loading managers...' : 'Checking assignment...'}
                  </Text>
                </View>
              ) : managers.length === 0 ? (
                <View className="py-8 items-center">
                  <Text className="text-[15px] text-[#64748B] text-center">
                    No Site Managers available
                  </Text>
                </View>
              ) : (
                managers.map((manager) => {
                  const isSelected = value === manager.id;
                  const displayName = manager.displayName || manager.email || 'Unknown';

                  return (
                    <TouchableOpacity
                      key={manager.id}
                      className={`border border-[#E2E8F0] rounded-lg h-12 px-4 flex-row items-center justify-between ${
                        isSelected ? 'bg-[#1E40AF]/10 border-[#1E40AF]' : 'bg-white'
                      }`}
                      onPress={() => handleSelect(manager.id)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Select manager: ${displayName}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View className="flex-1">
                        <Text
                          className={`text-[15px] font-medium ${
                            isSelected ? 'text-[#1E40AF]' : 'text-[#0F172A]'
                          }`}
                        >
                          {displayName}
                        </Text>
                        {manager.email && manager.displayName && (
                          <Text className="text-[13px] text-[#64748B]">{manager.email}</Text>
                        )}
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#1E40AF" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <TouchableOpacity
              className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center mt-4"
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
              accessibilityLabel="Cancel manager selection"
              accessibilityRole="button"
            >
              <Text className="text-[15px] font-semibold text-[#1E40AF]">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <ManagerReassignmentConfirmationModal
        visible={confirmationVisible}
        managerName={pendingManagerName}
        siteName={conflictingSite?.name || 'another site'}
        onConfirm={handleConfirmReassignment}
        onCancel={handleCancelReassignment}
      />
    </View>
  );
};
