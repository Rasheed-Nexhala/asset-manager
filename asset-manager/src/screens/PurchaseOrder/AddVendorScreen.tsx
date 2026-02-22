import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { VendorForm } from '../../components/PurchaseOrder';
import {
  createVendor,
  updateVendor,
  getVendorById,
} from '../../services/firebase/vendorService';
import type { CreateVendorData } from '../../types/vendor';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';

type RouteParams = RouteProp<PurchaseOrderStackParamList, 'AddVendor'>;
type NavigationProp = StackNavigationProp<
  PurchaseOrderStackParamList,
  'AddVendor'
>;

export const AddVendorScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const vendorId = route.params?.vendorId;

  const [formData, setFormData] = useState<CreateVendorData>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    category: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateVendorData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vendorId) {
      setLoading(true);
      getVendorById(vendorId)
        .then((v) => {
          if (v) {
            setFormData({
              name: v.name,
              contactPerson: v.contactPerson,
              phone: v.phone,
              email: v.email ?? '',
              address: v.address ?? '',
              gstin: v.gstin ?? '',
              category: v.category,
            });
          }
        })
        .catch(() => Alert.alert('Error', 'Failed to load vendor'))
        .finally(() => setLoading(false));
    }
  }, [vendorId]);

  const validate = useCallback((): boolean => {
    const e: Partial<Record<keyof CreateVendorData, string>> = {};
    if (!formData.name.trim()) e.name = 'Vendor name is required';
    if (!formData.phone.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [formData.name, formData.phone]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (vendorId) {
        await updateVendor(vendorId, {
          name: formData.name.trim(),
          contactPerson: formData.contactPerson.trim(),
          phone: formData.phone.trim(),
          email: formData.email?.trim() || undefined,
          address: formData.address?.trim() || undefined,
          gstin: formData.gstin?.trim() || undefined,
          category: formData.category.trim() || 'other',
        });
        Alert.alert('Success', 'Vendor updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createVendor({
          name: formData.name.trim(),
          contactPerson: formData.contactPerson.trim(),
          phone: formData.phone.trim(),
          email: formData.email?.trim() || undefined,
          address: formData.address?.trim() || undefined,
          gstin: formData.gstin?.trim() || undefined,
          category: formData.category.trim() || 'other',
        });
        Alert.alert('Success', 'Vendor added.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save vendor';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [vendorId, formData, validate, navigation]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  if (loading) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title={vendorId ? 'Edit Vendor' : 'Add Vendor'}
          showBack
          onBackPress={handleBack}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading vendor...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title={vendorId ? 'Edit Vendor' : 'Add Vendor'}
        showBack
        onBackPress={handleBack}
        rightAction={{
          label: 'Save',
          onPress: handleSave,
          loading: saving,
        }}
      />
      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <VendorForm
          data={formData}
          onChange={setFormData}
          errors={errors}
        />
      </ScrollView>
    </ScreenLayout>
  );
};
