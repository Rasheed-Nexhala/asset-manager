import React from 'react';
import { View, Text } from 'react-native';

/**
 * Props for the UserProfile card component.
 * All fields are optional so the card can render partial data (e.g. before role is loaded).
 */
export interface UserProfileProps {
  /** User's display name */
  displayName?: string | null;
  /** User's email address */
  email?: string | null;
  /** Firebase/auth user ID */
  userId?: string | null;
  /** Assigned role (e.g. Admin, Store Incharge) */
  role?: string | null;
  /** Whether the user account is active */
  isActive: boolean;
  /** List of permission codes to show as badges */
  permissions?: string[];
  /** Optional section title above the card content */
  sectionTitle?: string;
}

/**
 * UserProfile — Displays user information in a CIAMS-style card.
 * Used on the signed-in home screen and anywhere a compact user summary is needed.
 * Follows design system: standard card, semantic status color, 48px touch targets for any actions.
 */
export const UserProfile: React.FC<UserProfileProps> = ({
  displayName,
  email,
  userId,
  role,
  isActive,
  permissions = [],
  sectionTitle = 'User Information',
}) => {
  return (
    <View
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]"
      accessibilityRole="summary"
      accessibilityLabel={`User profile: ${sectionTitle}`}
    >
      <Text
        className="text-[17px] font-semibold text-[#0F172A] mb-4"
        accessibilityRole="header"
      >
        {sectionTitle}
      </Text>

      <View className="gap-4">
        {displayName ? (
          <View>
            <Text className="text-[13px] text-[#64748B] mb-1">Name</Text>
            <Text className="text-[15px] text-[#0F172A]">{displayName}</Text>
          </View>
        ) : null}

        {email ? (
          <View>
            <Text className="text-[13px] text-[#64748B] mb-1">Email</Text>
            <Text className="text-[15px] text-[#0F172A]">{email}</Text>
          </View>
        ) : null}

        {userId ? (
          <View>
            <Text className="text-[13px] text-[#64748B] mb-1">User ID</Text>
            <Text className="text-[13px] text-[#64748B] font-mono">{userId}</Text>
          </View>
        ) : null}

        {role ? (
          <View>
            <Text className="text-[13px] text-[#64748B] mb-1">Role</Text>
            <Text className="text-[15px] text-[#0F172A] font-semibold">{role}</Text>
          </View>
        ) : null}

        <View>
          <Text className="text-[13px] text-[#64748B] mb-1">Status</Text>
          <Text
            className={`text-[15px] ${isActive ? 'text-[#10B981]' : 'text-[#DC2626]'}`}
            accessibilityLabel={isActive ? 'Active' : 'Inactive'}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>

        {permissions.length > 0 ? (
          <View>
            <Text className="text-[13px] text-[#64748B] mb-1">Permissions</Text>
            <View className="flex-row flex-wrap gap-2 mt-1">
              {permissions.map((perm) => (
                <View
                  key={perm}
                  className="bg-[#3B82F6]/10 px-2 py-1 rounded"
                  accessibilityLabel={`Permission: ${perm}`}
                >
                  <Text className="text-[12px] text-[#3B82F6] font-medium">{perm}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};
