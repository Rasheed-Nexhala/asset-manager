import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InvoiceUploadFieldProps {
  fileName: string | null;
  fileUrl: string | null;
  onUpload: () => void;
  onRemove?: () => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export const InvoiceUploadField: React.FC<InvoiceUploadFieldProps> = ({
  fileName,
  fileUrl,
  onUpload,
  onRemove,
  label = 'Invoice/Bill',
  required = false,
  error,
}) => {
  const hasFile = Boolean(fileName && fileUrl);

  return (
    <View>
      <Text className="text-[15px] font-medium text-[#0F172A] mb-1.5">
        {label}
        {required && <Text className="text-[#DC2626]"> *</Text>}
      </Text>
      <TouchableOpacity
        onPress={onUpload}
        className={`border rounded-lg p-4 flex-row items-center gap-3 ${
          error ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
        } bg-white`}
        accessibilityRole="button"
        accessibilityLabel={hasFile ? 'Change invoice' : 'Upload invoice'}
      >
        <View className="w-10 h-10 rounded-lg bg-[#1E40AF]/15 items-center justify-center">
          <Ionicons name="document-attach-outline" size={24} color="#1E40AF" />
        </View>
        <View className="flex-1">
          {hasFile ? (
            <>
              <Text className="text-[15px] font-medium text-[#0F172A]">
                {fileName}
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text className="text-[13px] text-[#16A34A]">Uploaded</Text>
              </View>
            </>
          ) : (
            <Text className="text-[15px] text-[#94A3B8]">+ Upload Invoice</Text>
          )}
        </View>
        {hasFile && onRemove && (
          <TouchableOpacity
            onPress={onRemove}
            className="p-2"
            accessibilityLabel="Remove invoice"
          >
            <Ionicons name="close-circle" size={24} color="#DC2626" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {error && (
        <Text className="text-[13px] text-[#DC2626] mt-1">{error}</Text>
      )}
    </View>
  );
};
