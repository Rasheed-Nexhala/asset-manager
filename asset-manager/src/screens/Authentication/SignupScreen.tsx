import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FormField } from '../../components/FormField';
import type { AuthFormValues, AuthFormErrors } from '../../types/auth';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signUpUser, clearError } from '../../store/slices/authSlice';
import { selectAuthLoading, selectAuthError } from '../../store/selectors/authSelectors';
import { validateSignupForm } from '../../utils/authValidation';

const defaultValues: AuthFormValues = {
  name: '',
  email: '',
  password: '',
};

interface SignupScreenProps {
  onGoToLogin?: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ onGoToLogin }) => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const authError = useAppSelector(selectAuthError);

  const [values, setValues] = useState<AuthFormValues>(defaultValues);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (authError) dispatch(clearError());
  }, [values.email, values.password, values.name, confirmPassword, authError, dispatch]);

  const updateField = useCallback((field: keyof AuthFormValues, text: string) => {
    setValues((prev) => ({ ...prev, [field]: text }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (authError) dispatch(clearError());
  }, [authError, dispatch]);

  const updateConfirmPassword = useCallback((text: string) => {
    setConfirmPassword(text);
    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    if (authError) dispatch(clearError());
  }, [authError, dispatch]);

  const handleSubmit = useCallback(async () => {
    const nextErrors = validateSignupForm(values, confirmPassword);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const trimmedEmail = values.email.trim();
    const trimmedPassword = values.password;
    const trimmedName = values.name.trim();

    try {
      await dispatch(
        signUpUser({
          email: trimmedEmail,
          password: trimmedPassword,
          displayName: trimmedName,
        })
      ).unwrap();
    } catch (error: unknown) {
      console.error('Signup error:', error);
    }
  }, [values, confirmPassword, dispatch]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-1 justify-center px-4 py-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text
              className="text-[22px] text-center font-semibold text-[#0F172A] mb-1"
              accessibilityRole="header"
            >
              Create account
            </Text>
            <Text className="text-[15px] text-center text-[#64748B] mb-6">
              Enter your details to get started.
            </Text>

            <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] gap-4">
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
                placeholder="At least 6 characters"
                error={errors.password}
                secureTextEntry={!showPassword}
                accessibilityLabel="Password"
                rightIcon={
                  <Ionicons 
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={22} 
                    color="#64748B" 
                  />
                }
                onRightIconPress={() => setShowPassword(!showPassword)}
              />
              <FormField
                label="Confirm password"
                value={confirmPassword}
                onChangeText={updateConfirmPassword}
                placeholder="Re-enter your password"
                error={errors.confirmPassword}
                secureTextEntry={!showConfirmPassword}
                accessibilityLabel="Confirm password"
                rightIcon={
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={22} 
                    color="#64748B" 
                  />
                }
                onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />

              {authError ? (
                <View
                  className="p-3 rounded-lg bg-[#DC2626]/10 border-[1.5px] border-[#DC2626]"
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                >
                  <View className="flex-row items-start gap-2">
                    <Text className="text-[18px] mt-0.5">⚠️</Text>
                    <Text className="text-[14px] text-[#DC2626] flex-1 leading-5">
                      {authError}
                    </Text>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                className={`rounded-[10px] h-[50px] flex-row items-center justify-center gap-2 ${
                  isLoading ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
                }`}
                activeOpacity={0.7}
                onPress={handleSubmit}
                disabled={isLoading}
                accessibilityLabel={isLoading ? 'Creating account, please wait' : 'Create account'}
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoading, busy: isLoading }}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
                  </>
                ) : (
                  <Text className="text-[15px] font-semibold text-white">Create account</Text>
                )}
              </TouchableOpacity>
            </View>

            {onGoToLogin && (
              <TouchableOpacity
                className="mt-6 items-center py-3"
                onPress={onGoToLogin}
                activeOpacity={0.7}
                accessibilityLabel="Already have an account? Log in"
                accessibilityRole="button"
              >
                <Text className="text-[15px] text-[#3B82F6]">
                  Already have an account? Log in
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
