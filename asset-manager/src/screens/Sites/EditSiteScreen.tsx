import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, ScreenLayout, SiteForm } from '../../components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateSite, fetchSites, clearError } from '../../store/slices/sitesSlice';
import { selectSiteById, selectSitesLoading, selectSitesError } from '../../store/selectors/sitesSelectors';
import { getSite } from '../../services/firebase/siteService';
import type { SiteFormData, Site } from '../../types/sites';

interface RouteParams {
  siteId: string;
}

export const EditSiteScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { siteId } = (route.params as RouteParams) || {};

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isLoading = useAppSelector(selectSitesLoading);
  const error = useAppSelector(selectSitesError);

  // Memoize initial data to prevent unnecessary re-renders
  const initialData: Partial<SiteFormData> = useMemo(
    () => site ? ({
      name: site.name,
      description: site.description,
      address: site.address,
      contactNumber: site.contactNumber,
      managerId: site.managerId || null,
      status: site.status,
    }) : {},
    [site]
  );

  // Load site data
  useEffect(() => {
    const loadSite = async () => {
      if (!siteId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const siteData = await getSite(siteId);
        setSite(siteData);
      } catch (err) {
        console.error('Error loading site:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSite();
  }, [siteId]);

  const handleSubmit = useCallback(
    async (formData: SiteFormData) => {
      if (!siteId) return;

      try {
        await dispatch(updateSite({ siteId, formData })).unwrap();
        // Refresh sites list and navigate back
        await dispatch(fetchSites());
        // @ts-ignore - navigation typing varies by navigator
        navigation.goBack();
      } catch (err) {
        // Error is handled by Redux state and displayed in form
        console.error('Error updating site:', err);
      }
    },
    [dispatch, navigation, siteId]
  );

  const handleCancel = useCallback(() => {
    // @ts-ignore - navigation typing varies by navigator
    navigation.goBack();
  }, [navigation]);

  const handleBack = useCallback(() => {
    // @ts-ignore - navigation typing varies by navigator
    navigation.goBack();
  }, [navigation]);

  useAutoClearError(error, () => dispatch(clearError()));

  // Loading state
  if (loading) {
    return (
      <ScreenLayout edges={['top']} keyboardAware>
        <ScreenHeader
          title="Edit Site"
          showBack
          onBackPress={handleBack}
          rightAction={{
            label: 'Cancel',
            onPress: handleCancel,
            accessibilityLabel: 'Cancel editing site',
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading site...</Text>
        </View>
      </ScreenLayout>
    );
  }

  // Error state (site not found)
  if (!site) {
    return (
      <ScreenLayout edges={['top']} keyboardAware>
        <ScreenHeader
          title="Edit Site"
          showBack
          onBackPress={handleBack}
          rightAction={{
            label: 'Cancel',
            onPress: handleCancel,
            accessibilityLabel: 'Cancel editing site',
          }}
        />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle" size={80} color="#DC2626" />
          <Text className="text-[22px] font-semibold text-[#0F172A] mb-2 mt-4">Site Not Found</Text>
          <Text className="text-[15px] text-[#64748B] mb-6 text-center">
            The site you're trying to edit could not be found.
          </Text>
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center flex-row gap-2"
            onPress={handleCancel}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']} keyboardAware>
      <ScreenHeader
        title="Edit Site"
        showBack
        onBackPress={handleBack}
        rightAction={{
          label: 'Cancel',
          onPress: handleCancel,
          accessibilityLabel: 'Cancel editing site',
        }}
      />

      {/* Error Banner */}
      {error && (
        <View
          className="p-3 mx-4 mt-3 rounded-lg bg-[#DC2626]/10 border-[1.5px] border-[#DC2626]"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <View className="flex-row items-start gap-2">
            <Ionicons name="warning" size={24} color="#DC2626" />
            <Text className="text-[14px] text-[#DC2626] flex-1 leading-5">{error}</Text>
          </View>
        </View>
      )}

      {/* Form */}
      <SiteForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitButtonLabel="Save"
        siteId={siteId}
      />
    </ScreenLayout>
  );
};
