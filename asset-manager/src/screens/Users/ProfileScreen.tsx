import React, { useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { ScreenHeader, ScreenLayout, UserProfile } from '../../components';
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

export const ProfileScreen: React.FC = () => {
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
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Profile"
        rightAction={{
          label: 'Sign out',
          onPress: handleLogout,
          loading: isLoading,
          accessibilityLabel: 'Sign out',
          accessibilityLabelLoading: 'Signing out, please wait',
        }}
      />

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
    </ScreenLayout>
  );
};
