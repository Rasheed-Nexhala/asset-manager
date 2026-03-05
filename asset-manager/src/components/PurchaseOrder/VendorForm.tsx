import React from 'react';
import { View } from 'react-native';
import { FormField } from '../FormField';
import type { CreateVendorData } from '../../types/vendor';

interface VendorFormProps {
  data: CreateVendorData;
  onChange: (data: CreateVendorData) => void;
  errors?: Partial<Record<keyof CreateVendorData, string>>;
}

export const VendorForm: React.FC<VendorFormProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const handleChange = (field: keyof CreateVendorData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <View className="gap-4">
      <FormField
        label="Vendor Name"
        value={data.name}
        onChangeText={(v) => handleChange('name', v)}
        placeholder="Enter vendor name"
        error={errors.name}
        required
      />
      <FormField
        label="Contact Person"
        value={data.contactPerson}
        onChangeText={(v) => handleChange('contactPerson', v)}
        placeholder="Contact person name"
        error={errors.contactPerson}
      />
      <FormField
        label="Phone Number"
        value={data.phone}
        onChangeText={(v) => handleChange('phone', v)}
        placeholder="+91-"
        keyboardType="phone-pad"
        error={errors.phone}
        required
      />
      <FormField
        label="Email"
        value={data.email ?? ''}
        onChangeText={(v) => handleChange('email', v)}
        placeholder="email@example.com"
        keyboardType="email-address"
        error={errors.email}
      />
      <FormField
        label="Address"
        value={data.address ?? ''}
        onChangeText={(v) => handleChange('address', v)}
        placeholder="Full address"
        error={errors.address}
        multiline
      />
    </View>
  );
};
