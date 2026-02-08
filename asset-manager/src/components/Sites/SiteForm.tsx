import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormField } from '../FormField';
import { SiteManagerSelector } from './SiteManagerSelector';
import type { SiteFormData, SiteStatus } from '../../types/sites';

export interface SiteFormProps {
  initialData?: Partial<SiteFormData>;
  onSubmit: (data: SiteFormData) => void;
  isLoading?: boolean;
  submitButtonLabel?: string;
}

interface FormErrors {
  name?: string;
  address?: string;
  contactNumber?: string;
}

const validatePhoneNumber = (phone: string): boolean => {
  if (!phone.trim()) return true;
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone.trim());
};

export const SiteForm: React.FC<SiteFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonLabel = 'Save',
}) => {
  const [formData, setFormData] = useState<SiteFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    address: initialData?.address || '',
    contactNumber: initialData?.contactNumber || '',
    managerId: initialData?.managerId || null,
    status: initialData?.status || 'active',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        address: initialData.address || '',
        contactNumber: initialData.contactNumber || '',
        managerId: initialData.managerId || null,
        status: initialData.status || 'active',
      });
    }
  }, [
    initialData?.name,
    initialData?.description,
    initialData?.address,
    initialData?.contactNumber,
    initialData?.managerId,
    initialData?.status,
  ]);

  const handleFieldChange = useCallback((field: keyof SiteFormData, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  }, [errors]);

  const handleStatusChange = useCallback((status: SiteStatus) => {
    setFormData((prev) => ({
      ...prev,
      status,
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Site name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Site name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Site name must be less than 100 characters';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length > 200) {
      newErrors.address = 'Address must be less than 200 characters';
    }

    if (formData.contactNumber && !validatePhoneNumber(formData.contactNumber)) {
      newErrors.contactNumber = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" contentContainerStyle={{ padding: 16 }}>
      <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] gap-4">
        <FormField
          label="Site Name"
          required
          value={formData.name}
          onChangeText={(text) => handleFieldChange('name', text)}
          placeholder="e.g. Site A"
          error={errors.name}
          accessibilityLabel="Site name"
        />

        <FormField
          label="Project Description"
          value={formData.description}
          onChangeText={(text) => handleFieldChange('description', text)}
          placeholder="Brief project description"
          multiline
          numberOfLines={3}
          accessibilityLabel="Project description"
        />

        <FormField
          label="Location/Address"
          required
          value={formData.address}
          onChangeText={(text) => handleFieldChange('address', text)}
          placeholder="Street, city"
          error={errors.address}
          accessibilityLabel="Location address"
        />

        <FormField
          label="Contact Number"
          value={formData.contactNumber}
          onChangeText={(text) => handleFieldChange('contactNumber', text)}
          placeholder="Phone number"
          keyboardType="phone-pad"
          error={errors.contactNumber}
          accessibilityLabel="Contact number"
        />

        <SiteManagerSelector
          value={formData.managerId}
          onChange={(managerId) => handleFieldChange('managerId', managerId)}
        />

        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Status</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 border-[1.5px] rounded-[10px] h-[50px] flex-row items-center justify-center gap-2 ${
                formData.status === 'active'
                  ? 'bg-[#16A34A]/15 border-[#16A34A]'
                  : 'bg-white border-[#E2E8F0]'
              }`}
              onPress={() => handleStatusChange('active')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Set status to Active"
              accessibilityState={{ selected: formData.status === 'active' }}
            >
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={formData.status === 'active' ? '#16A34A' : '#64748B'}
              />
              <Text
                className={`text-[15px] font-semibold ${
                  formData.status === 'active' ? 'text-[#16A34A]' : 'text-[#64748B]'
                }`}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 border-[1.5px] rounded-[10px] h-[50px] flex-row items-center justify-center gap-2 ${
                formData.status === 'inactive'
                  ? 'bg-[#DC2626]/15 border-[#DC2626]'
                  : 'bg-white border-[#E2E8F0]'
              }`}
              onPress={() => handleStatusChange('inactive')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Set status to Inactive"
              accessibilityState={{ selected: formData.status === 'inactive' }}
            >
              <Ionicons
                name="close-circle"
                size={24}
                color={formData.status === 'inactive' ? '#DC2626' : '#64748B'}
              />
              <Text
                className={`text-[15px] font-semibold ${
                  formData.status === 'inactive' ? 'text-[#DC2626]' : 'text-[#64748B]'
                }`}
              >
                Inactive
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        className={`bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center mt-4 ${
          isLoading ? 'opacity-70' : ''
        }`}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={isLoading ? 'Saving site, please wait' : submitButtonLabel}
        accessibilityState={{ disabled: isLoading, busy: isLoading }}
      >
        {isLoading ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">{submitButtonLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};
