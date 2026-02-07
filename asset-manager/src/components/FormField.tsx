import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

/**
 * FormField — Reusable labeled input following CIAMS design system.
 * Use for any form that needs consistent label + input + error layout.
 *
 * Spacing: 6px between label and input (gap-1.5), per CIAMS.
 * Input height: 48px minimum for touch targets.
 */
export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  /** Label shown above the input (e.g. "Email", "Password") */
  label: string;
  /** Current value (controlled input) */
  value: string;
  /** Called when text changes */
  onChangeText: (text: string) => void;
  /** Placeholder when empty */
  placeholder?: string;
  /** Error message shown below input; when set, border uses danger color */
  error?: string;
  /** For password fields */
  secureTextEntry?: boolean;
  /** Accessibility label for the input (recommended for screen readers) */
  accessibilityLabel?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  accessibilityLabel,
  ...rest
}) => {
  const hasError = Boolean(error);

  return (
    <View className="gap-1.5">
      <Text
        className="text-[15px] text-[#0F172A]"
        accessibilityRole="text"
      >
        {label}
      </Text>
      <TextInput
        className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
          hasError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
        }`}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="none"
        accessibilityState={{ disabled: rest.editable === false }}
        {...rest}
      />
      {error ? (
        <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
};
