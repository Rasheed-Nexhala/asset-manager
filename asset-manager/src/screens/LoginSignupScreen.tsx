import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '../components/FormField';
import type { AuthMode, AuthFormValues, AuthFormErrors } from '../types/auth';

/**
 * LoginSignupScreen — Single screen for both Log in and Sign up.
 *
 * Design (CIAMS):
 * - One primary action per screen: "Log in" or "Create account"
 * - Toggle between modes via secondary text link
 * - Form in a standard card; inputs 48px min height; spacing gap-4
 *
 * Accessibility:
 * - All buttons/inputs have accessibilityLabel and accessibilityRole
 * - Minimum 48px touch targets (h-12 inputs, h-[50px] buttons)
 */
export interface LoginSignupScreenProps {
  /** Called when user submits login form (email, password) */
  onLogin?: (email: string, password: string) => void | Promise<void>;
  /** Called when user submits signup form (name, email, password) */
  onSignup?: (name: string, email: string, password: string) => void | Promise<void>;
}

const defaultValues: AuthFormValues = {
  name: '',
  email: '',
  password: '',
};

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const LoginSignupScreen: React.FC<LoginSignupScreenProps> = ({
  onLogin,
  onSignup,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [values, setValues] = useState<AuthFormValues>(defaultValues);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === 'login';

  const updateField = useCallback((field: keyof AuthFormValues, text: string) => {
    setValues((prev) => ({ ...prev, [field]: text }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const switchMode = useCallback(() => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setValues(defaultValues);
    setErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    const next: AuthFormErrors = {};
    if (!values.email.trim()) {
      next.email = 'Email is required';
    } else if (!validateEmail(values.email)) {
      next.email = 'Please enter a valid email';
    }
    if (!values.password) {
      next.password = 'Password is required';
    } else if (values.password.length < 6) {
      next.password = 'Password must be at least 6 characters';
    }
    if (!isLogin) {
      if (!values.name.trim()) {
        next.name = 'Name is required';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values, isLogin]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (isLogin && onLogin) {
        await onLogin(values.email.trim(), values.password);
      } else if (!isLogin && onSignup) {
        await onSignup(values.name.trim(), values.email.trim(), values.password);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isLogin, values, validate, onLogin, onSignup]);

  const submitLabel = isLogin ? 'Log in' : 'Create account';
  const toggleLabel = isLogin
    ? "Don't have an account? Sign up"
    : 'Already have an account? Log in';

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4 py-6">
          {/* Screen title — CIAMS: text-[22px] font-semibold */}
          <Text
            className="text-[22px] font-semibold text-[#0F172A] mb-1"
            accessibilityRole="header"
          >
            {isLogin ? 'Welcome back' : 'Create account'}
          </Text>
          <Text className="text-[15px] text-[#64748B] mb-6">
            {isLogin
              ? 'Enter your email and password to continue.'
              : 'Enter your details to get started.'}
          </Text>

          {/* Form card — CIAMS standard card */}
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] gap-4">
            {!isLogin && (
              <FormField
                label="Name"
                value={values.name}
                onChangeText={(text) => updateField('name', text)}
                placeholder="Your name"
                error={errors.name}
                accessibilityLabel="Full name"
                autoCapitalize="words"
                autoCorrect={false}
              />
            )}
            <FormField
              label="Email"
              value={values.email}
              onChangeText={(text) => updateField('email', text)}
              placeholder="you@example.com"
              error={errors.email}
              accessibilityLabel="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FormField
              label="Password"
              value={values.password}
              onChangeText={(text) => updateField('password', text)}
              placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
              error={errors.password}
              secureTextEntry
              accessibilityLabel="Password"
            />

            {/* Primary button — one per screen, min 50px height */}
            <TouchableOpacity
              className={`rounded-[10px] h-[50px] items-center justify-center mt-1 ${
                isSubmitting ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
              }`}
              activeOpacity={0.7}
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityLabel={submitLabel}
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
            >
              <Text className="text-[15px] font-semibold text-white">
                {isSubmitting ? 'Please wait…' : submitLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toggle mode — secondary text link */}
          <TouchableOpacity
            className="mt-6 items-center py-3"
            onPress={switchMode}
            activeOpacity={0.7}
            accessibilityLabel={toggleLabel}
            accessibilityRole="button"
          >
            <Text className="text-[15px] text-[#3B82F6]">{toggleLabel}</Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
