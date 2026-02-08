import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenHeader, ScreenLayout, UserProfile, Users } from '../../components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signOutUser } from '../../store/slices/authSlice';
import {
  selectAuthLoading,
  selectUserDisplayName,
  selectUserEmail,
  selectUserId,
  selectUserRoleType,
  selectIsActive,
  selectUserPermissions,
} from '../../store/selectors/authSelectors';

type SignedInTab = 'profile' | 'users';

export const SignedInScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SignedInTab>('profile');
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const displayName = useAppSelector(selectUserDisplayName);
  const email = useAppSelector(selectUserEmail);
  const userId = useAppSelector(selectUserId);
  const role = useAppSelector(selectUserRoleType);
  const isActive = useAppSelector(selectIsActive);
  const permissions = useAppSelector(selectUserPermissions);

  const handleLogout = useCallback(async () => {
    try {
      await dispatch(signOutUser()).unwrap();
    } catch (error: unknown) {
      console.error('Logout error:', error);
    }
  }, [dispatch]);

  return (
    <ScreenLayout edges={['top', 'bottom']}>
      <ScreenHeader
        title="Profiles"
        rightAction={{
          label: 'Sign out',
          onPress: handleLogout,
          loading: isLoading,
          accessibilityLabel: 'Sign out',
          accessibilityLabelLoading: 'Signing out, please wait',
        }}
      />

      {/* Tab bar */}
      <View className="flex-row border-b border-[#E2E8F0] bg-white px-4">
        <TouchableOpacity
          className={`flex-1 py-4 items-center border-b-2 ${
            activeTab === 'profile' ? 'border-[#1E40AF]' : 'border-transparent'
          }`}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.7}
          accessibilityLabel="Profile tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'profile' }}
        >
          <Text
            className={`text-[15px] font-semibold ${
              activeTab === 'profile' ? 'text-[#1E40AF]' : 'text-[#64748B]'
            }`}
          >
            Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-4 items-center border-b-2 ${
            activeTab === 'users' ? 'border-[#1E40AF]' : 'border-transparent'
          }`}
          onPress={() => setActiveTab('users')}
          activeOpacity={0.7}
          accessibilityLabel="Users tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'users' }}
        >
          <Text
            className={`text-[15px] font-semibold ${
              activeTab === 'users' ? 'text-[#1E40AF]' : 'text-[#64748B]'
            }`}
          >
            Users
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-4 py-6">
            <View className="mb-6">
              <UserProfile
                displayName={displayName}
                email={email}
                userId={userId}
                role={role || 'Unassigned'}
                isActive={isActive}
                permissions={permissions}
                showPasswordUpdate={true}
              />
            </View>
          </View>
        </ScrollView>
      )}
      {activeTab === 'users' && (
        <View className="flex-1">
          <Users />
        </View>
      )}
    </ScreenLayout>
  );
};
