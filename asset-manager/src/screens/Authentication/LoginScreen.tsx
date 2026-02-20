import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components';
import { FormField } from '../../components/FormField';
import { AuthLogo } from '../../components/AuthLogo';
import type { AuthFormValues, AuthFormErrors } from '../../types/auth';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signInUser, clearError } from '../../store/slices/authSlice';
import { selectAuthLoading, selectAuthError } from '../../store/selectors/authSelectors';
import { validateLoginForm } from '../../utils/authValidation';

const defaultValues: AuthFormValues = {
  name: '',
  email: '',
  password: '',
};

interface LoginScreenProps {
  onGoToSignup?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoToSignup }) => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const authError = useAppSelector(selectAuthError);

  const [values, setValues] = useState<AuthFormValues>(defaultValues);
  const [errors, setErrors] = useState<AuthFormErrors>({});

  const updateField = useCallback((field: keyof AuthFormValues, text: string) => {
    setValues((prev) => ({ ...prev, [field]: text }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    // Clear auth error when user starts typing to fix their input
    if (authError) dispatch(clearError());
  }, [authError, dispatch]);

  const handleSubmit = useCallback(async () => {
    const nextErrors = validateLoginForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const trimmedEmail = values.email.trim();
    const trimmedPassword = values.password;

    try {
      await dispatch(signInUser({ email: trimmedEmail, password: trimmedPassword })).unwrap();
    } catch (error: unknown) {
      console.error('Login error:', error);
    }
  }, [values, dispatch]);

  return (
    <ScreenLayout edges={['top', 'bottom']} keyboardAware>
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-1 justify-center px-4 py-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <AuthLogo className="mb-6" />
          <Text
            className="text-[22px] text-center font-semibold text-[#0F172A] mb-1"
            accessibilityRole="header"
          >
            Welcome back
          </Text>
          <Text className="text-[15px] text-center text-[#64748B] mb-6">
            Enter your email and password to continue.
          </Text>

          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] gap-4">
            <FormField
              label="Email"
              required
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
              required
              value={values.password}
              onChangeText={(text) => updateField('password', text)}
              placeholder="Your password"
              error={errors.password}
              secureTextEntry
              accessibilityLabel="Password"
            />

            <TouchableOpacity
              className={`rounded-[10px] h-[50px] flex-row items-center justify-center gap-2 ${
                isLoading ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
              }`}
              activeOpacity={0.7}
              onPress={handleSubmit}
              disabled={isLoading}
              accessibilityLabel={isLoading ? 'Signing in, please wait' : 'Log in'}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
                </>
              ) : (
                <Text className="text-[15px] font-semibold text-white">Log in</Text>
              )}
            </TouchableOpacity>

            {authError ? (
              <View
                className="p-3 rounded-lg bg-[#DC2626]/10 border-[1.5px] border-[#DC2626]"
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <View className="flex-row items-start gap-2">
                  <Ionicons name="warning" size={20} color="#D97706" />
                  <Text className="text-[18px] mt-0.5 font-semibold text-[#D97706]">Warning</Text>
                  <Text className="text-[14px] text-[#DC2626] flex-1 leading-5">
                    {authError}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {onGoToSignup && (
            <TouchableOpacity
              className="mt-6 items-center py-3"
              onPress={onGoToSignup}
              activeOpacity={0.7}
              accessibilityLabel="Don't have an account? Sign up"
              accessibilityRole="button"
            >
              <Text className="text-[15px] text-[#3B82F6]">
                Don't have an account? Sign up
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
