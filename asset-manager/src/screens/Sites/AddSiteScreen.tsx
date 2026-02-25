import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, ScreenLayout, SiteForm } from '../../components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createSite } from '../../store/slices/sitesSlice';
import { selectSitesLoading, selectSitesError } from '../../store/selectors/sitesSelectors';
import type { SiteFormData } from '../../types/sites';

export const AddSiteScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const handleBack = useCallback(() => {
    // @ts-ignore - navigation typing varies by navigator
    navigation.goBack();
  }, [navigation]);
  const isLoading = useAppSelector(selectSitesLoading);
  const error = useAppSelector(selectSitesError);

  const handleSubmit = useCallback(
    async (formData: SiteFormData) => {
      try {
        await dispatch(createSite(formData)).unwrap();
        // Navigate back on success
        // @ts-ignore - navigation typing varies by navigator
        navigation.goBack();
      } catch (err) {
        // Error is handled by Redux state and displayed in form
        console.error('Error creating site:', err);
      }
    },
    [dispatch, navigation]
  );

  const handleCancel = useCallback(() => {
    // @ts-ignore - navigation typing varies by navigator
    navigation.goBack();
  }, [navigation]);

  return (
    <ScreenLayout edges={['top']} keyboardAware>
      <ScreenHeader
        title="Add New Site"
        showBack
        onBackPress={handleBack}
        rightAction={{
          label: 'Cancel',
          onPress: handleCancel,
          accessibilityLabel: 'Cancel adding site',
        }}
      />

      {/* Error Banner */}
      {error && (
        <View
          className="p-3 mx-4 mt-3 rounded-lg bg-[#DC2626]/10 border-[1.5px] border-[#DC2626]"
          accessibilityRole="alert"
          accessibilityLabel={error}
          accessibilityLiveRegion="polite"
        >
          <View className="flex-row items-start gap-2">
            <Ionicons name="warning" size={24} color="#DC2626" />
            <Text className="text-[14px] text-[#DC2626] flex-1 leading-5">{error}</Text>
          </View>
        </View>
      )}

      {/* Form */}
      <SiteForm onSubmit={handleSubmit} isLoading={isLoading} submitButtonLabel="Save" />
    </ScreenLayout>
  );
};
