import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  subscribeToAllUsers,
  updateUserRole,
  updateUserActiveStatus,
} from '../../services/firebase/userRoleService';
import type { UserListItem, UserRole } from '../../types/roles';

/**
 * Role options for the dropdown
 */
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'Admin', label: 'Admin' },
  { value: 'StoreIncharge', label: 'Store Incharge' },
  { value: 'SiteManager', label: 'Site Manager' },
  { value: 'Unassigned', label: 'Unassigned' },
];

/**
 * Pending changes for a user
 */
interface PendingChanges {
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Users — Component for listing and managing users.
 * Accessible to all authenticated users.
 * Changes are saved only when the Save button is clicked.
 */
export const Users: React.FC = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [roleModalVisible, setRoleModalVisible] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserCurrentRole, setSelectedUserCurrentRole] = useState<UserRole | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChanges>>({});

  /**
   * Set up real-time listener for all users
   */
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToAllUsers((usersList) => {
      setUsers(usersList);
      setLoading(false);
      setRefreshing(false);
      setError(null);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Handle pull-to-refresh
   * Note: With real-time listeners, refresh is less necessary,
   * but we keep it for user preference
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Real-time listener will automatically update, so we just reset the refreshing state
    // after a short delay to show the refresh indicator
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  /**
   * Get the current value for a user (original or pending change)
   */
  const getCurrentUserValue = useCallback(
    (userId: string, field: 'role' | 'isActive') => {
      const user = users.find((u) => u.id === userId);
      if (!user) return null;

      const pending = pendingChanges[userId];
      if (field === 'role') {
        return pending?.role ?? user.role;
      }
      return pending?.isActive ?? user.isActive;
    },
    [users, pendingChanges]
  );

  /**
   * Check if a user has pending changes
   */
  const hasPendingChanges = useCallback(
    (userId: string) => {
      return pendingChanges[userId] && Object.keys(pendingChanges[userId]).length > 0;
    },
    [pendingChanges]
  );

  /**
   * Open role selection modal for a user
   */
  const handleRoleSelectPress = useCallback(
    (userId: string) => {
      const currentRole = getCurrentUserValue(userId, 'role') as UserRole;
      setSelectedUserId(userId);
      setSelectedUserCurrentRole(currentRole);
      setRoleModalVisible(true);
    },
    [getCurrentUserValue]
  );

  /**
   * Update pending role change (does not save to Firestore)
   */
  const handleRoleChange = useCallback(
    (newRole: UserRole) => {
      if (!selectedUserId) return;

      setPendingChanges((prev) => ({
        ...prev,
        [selectedUserId]: {
          ...prev[selectedUserId],
          role: newRole,
        },
      }));

      setRoleModalVisible(false);
      setSelectedUserId(null);
      setSelectedUserCurrentRole(null);
    },
    [selectedUserId]
  );

  /**
   * Update pending active status change (does not save to Firestore)
   */
  const handleActiveStatusChange = useCallback((userId: string, newIsActive: boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        isActive: newIsActive,
      },
    }));
  }, []);

  /**
   * Save changes for a user to Firestore
   */
  const handleSaveChanges = useCallback(
    async (userId: string) => {
      const changes = pendingChanges[userId];
      if (!changes || Object.keys(changes).length === 0) return;

      setSavingUserId(userId);
      setError(null);

      try {
        // Update role if changed
        if (changes.role !== undefined) {
          await updateUserRole(userId, changes.role);
        }

        // Update active status if changed
        if (changes.isActive !== undefined) {
          await updateUserActiveStatus(userId, changes.isActive);
        }

        // Clear pending changes for this user
        setPendingChanges((prev) => {
          const newChanges = { ...prev };
          delete newChanges[userId];
          return newChanges;
        });

        // Real-time listener will automatically update the UI
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
        setError(errorMessage);
        // Revert pending changes on error since real-time listener will show original state
        setPendingChanges((prev) => {
          const newChanges = { ...prev };
          delete newChanges[userId];
          return newChanges;
        });
      } finally {
        setSavingUserId(null);
      }
    },
    [pendingChanges]
  );

  /**
   * Cancel pending changes for a user
   */
  const handleCancelChanges = useCallback((userId: string) => {
    setPendingChanges((prev) => {
      const newChanges = { ...prev };
      delete newChanges[userId];
      return newChanges;
    });
  }, []);

  /**
   * Render a single user row card
   */
  const renderUserCard = useCallback(
    ({ item }: { item: UserListItem }) => {
      const isSaving = savingUserId === item.id;
      const hasChanges = hasPendingChanges(item.id);
      const currentRole = getCurrentUserValue(item.id, 'role') as UserRole;
      const currentIsActive = getCurrentUserValue(item.id, 'isActive') as boolean;
      const displayName = item.displayName || item.email || 'Unknown User';
      const email = item.email && item.displayName ? item.email : null;

      return (
        <View className={`bg-white rounded-[10px] p-4 border mb-3 ${hasChanges ? 'border-[#1E40AF]' : 'border-[#E2E8F0]'}`}>
          {/* Top Row: Name + Status Badge */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-[#0F172A]" numberOfLines={1}>
                {displayName}
              </Text>
              {email && (
                <Text className="text-[13px] text-[#64748B] mt-1" numberOfLines={1}>
                  {email}
                </Text>
              )}
            </View>
            <View className={`px-2 py-1 rounded-full ${currentIsActive ? 'bg-[#16A34A]/15' : 'bg-[#DC2626]/15'}`}>
              <Text className={`text-[12px] font-medium ${currentIsActive ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {currentIsActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Middle: Role Selector */}
          <View className="mb-3">
            <Text className="text-[13px] text-[#64748B] mb-1.5">Role</Text>
            <TouchableOpacity
              className={`border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-row items-center justify-between ${
                isSaving ? 'opacity-50' : ''
              }`}
              onPress={() => handleRoleSelectPress(item.id)}
              disabled={isSaving}
              activeOpacity={0.7}
              accessibilityLabel={`Change role for ${displayName}. Current role: ${currentRole}`}
              accessibilityRole="button"
            >
              <Text className="text-[15px] text-[#0F172A]">{currentRole}</Text>
              <Text className="text-[#64748B]">▼</Text>
            </TouchableOpacity>
          </View>

          {/* Active Status Toggle */}
          <View className="flex-row items-center justify-between border-t border-[#E2E8F0] pt-3 mb-3">
            <View className="flex-1">
              <Text className="text-[13px] text-[#64748B] mb-1">Active Status</Text>
              <Text className={`text-[15px] ${currentIsActive ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                {currentIsActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <Switch
              value={currentIsActive}
              onValueChange={(value) => handleActiveStatusChange(item.id, value)}
              disabled={isSaving}
              trackColor={{ false: '#E2E8F0', true: '#1E40AF' }}
              thumbColor={currentIsActive ? '#FFFFFF' : '#94A3B8'}
              accessibilityLabel={`Toggle active status for ${displayName}`}
            />
          </View>

          {/* Save and Cancel Buttons (only shown when there are changes) */}
          {hasChanges && (
            <View className="flex-row gap-3 border-t border-[#E2E8F0] pt-3">
              <TouchableOpacity
                className={`flex-1 border-[1.5px] border-[#E2E8F0] rounded-[10px] h-[48px] items-center justify-center ${
                  isSaving ? 'opacity-50' : ''
                }`}
                onPress={() => handleCancelChanges(item.id)}
                disabled={isSaving}
                activeOpacity={0.7}
                accessibilityLabel="Cancel changes"
                accessibilityRole="button"
              >
                <Text className="text-[15px] font-semibold text-[#64748B]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-[10px] h-[48px] flex-row items-center justify-center gap-2 ${
                  isSaving ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
                }`}
                onPress={() => handleSaveChanges(item.id)}
                disabled={isSaving}
                activeOpacity={0.7}
                accessibilityLabel={isSaving ? 'Saving changes, please wait' : 'Save changes'}
                accessibilityRole="button"
                accessibilityState={{ disabled: isSaving, busy: isSaving }}
              >
                {isSaving ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
                  </>
                ) : (
                  <Text className="text-[15px] font-semibold text-white">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [
      savingUserId,
      hasPendingChanges,
      getCurrentUserValue,
      handleRoleSelectPress,
      handleActiveStatusChange,
      handleSaveChanges,
      handleCancelChanges,
    ]
  );

  /**
   * Render role selection modal
   */
  const renderRoleModal = () => (
    <Modal
      visible={roleModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setRoleModalVisible(false)}
      accessibilityLabel="Select role"
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl p-4">
          {/* Handle Bar */}
          <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mb-4" />

          {/* Title */}
          <Text className="text-[22px] font-semibold text-[#0F172A] mb-4">
            Select Role
          </Text>

          {/* Role Options */}
          <View className="gap-2">
            {ROLE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                className={`border border-[#E2E8F0] rounded-lg h-12 px-4 flex-row items-center justify-between ${
                  selectedUserCurrentRole === option.value ? 'bg-[#1E40AF]/10 border-[#1E40AF]' : 'bg-white'
                }`}
                onPress={() => handleRoleChange(option.value)}
                activeOpacity={0.7}
                accessibilityLabel={`Select role: ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedUserCurrentRole === option.value }}
              >
                <Text
                  className={`text-[15px] font-medium ${
                    selectedUserCurrentRole === option.value ? 'text-[#1E40AF]' : 'text-[#0F172A]'
                  }`}
                >
                  {option.label}
                </Text>
                {selectedUserCurrentRole === option.value && (
                  <Text className="text-[#1E40AF]">✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center mt-4"
            onPress={() => {
              setRoleModalVisible(false);
              setSelectedUserId(null);
              setSelectedUserCurrentRole(null);
            }}
            activeOpacity={0.7}
            accessibilityLabel="Cancel role selection"
            accessibilityRole="button"
          >
            <Text className="text-[15px] font-semibold text-[#1E40AF]">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text className="text-[15px] text-[#64748B] mt-4">Loading users...</Text>
      </View>
    );
  }

  // Error state
  if (error && users.length === 0) {
    return (
      <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
        <Text className="text-[17px] font-semibold text-[#0F172A] mb-2">Users</Text>
        <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text>
        <Text className="text-[13px] text-[#64748B] mb-4">
          Real-time listener will automatically reconnect. Please wait or refresh the app.
        </Text>
      </View>
    );
  }

  // Empty state
  if (!loading && users.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12 px-4">
        <Text className="text-6xl mb-4">👥</Text>
        <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
          No Users Found
        </Text>
        <Text className="text-[15px] text-[#64748B] text-center mb-6">
          There are no users in the system yet.
        </Text>
      </View>
    );
  }

  // Main list view
  return (
    <View className="flex-1">
      {error && (
        <View className="bg-[#D97706]/15 px-4 py-2 mx-4 mb-3 rounded-lg">
          <Text className="text-[13px] text-[#D97706]">{error}</Text>
        </View>
      )}

      <FlatList
        data={users}
        renderItem={renderUserCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1E40AF" />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Text className="text-[15px] text-[#64748B]">No users found</Text>
          </View>
        }
      />

      {renderRoleModal()}
    </View>
  );
};
