import React, { useState, useCallback } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { Users } from '../../components/Users/Users';

export const UsersScreen: React.FC = () => {
  const navigation = useNavigation();
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  const handleLoadingChange = useCallback((loading: boolean, dataReceived: boolean) => {
    setInitialLoading(loading);
    setHasData(dataReceived);
  }, []);

  const showFullScreenLoader = initialLoading && !hasData;

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Users"
        showBack
        onBackPress={() => navigation.goBack()}
      />
      <View className="flex-1">
        {/* Users must always mount to subscribe and trigger onLoadingChange */}
        <Users onLoadingChange={handleLoadingChange} />
        {/* Full-screen initial loader overlay: prevents page flash until data loads */}
        {showFullScreenLoader && (
          <View
            className="absolute inset-0 bg-white items-center justify-center"
            accessibilityLabel="Loading users"
            accessibilityState={{ busy: true }}
          >
            <ActivityIndicator size="large" color="#1E40AF" />
            <Text className="text-[15px] text-[#64748B] mt-4">Loading...</Text>
          </View>
        )}
      </View>
    </ScreenLayout>
  );
};
