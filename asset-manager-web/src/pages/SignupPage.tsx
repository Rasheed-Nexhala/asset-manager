import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signUpUser, clearError } from '../store/slices/authSlice';
import { selectAuthLoading, selectAuthError, selectIsAuthenticated } from '../store/selectors/authSelectors';
import { useAutoClearError } from '../hooks/useAutoClearError';
import { validateSignupForm } from '../utils/authValidation';
import type { AuthFormValues, AuthFormErrors } from '../types/auth';
import { AuthLogo } from '../components/auth/AuthLogo';
import { FormField } from '../components/auth/FormField';
import { Icon } from '../components/shared/Icon';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

const defaultValues: AuthFormValues = {
  name: '',
  email: '',
  password: '',
};

export function SignupPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isLoading = useAppSelector(selectAuthLoading);
  const authError = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [values, setValues] = useState<AuthFormValues>(defaultValues);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useAutoClearError(authError ?? undefined, () => dispatch(clearError()));

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const updateField = useCallback(
    (field: keyof AuthFormValues, text: string) => {
      setValues((prev) => ({ ...prev, [field]: text }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      if (authError) dispatch(clearError());
    },
    [authError, dispatch]
  );

  const updateConfirmPassword = useCallback(
    (text: string) => {
      setConfirmPassword(text);
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
      if (authError) dispatch(clearError());
    },
    [authError, dispatch]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
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
      } catch (error) {
        console.error('Signup error:', error);
      }
    },
    [values, confirmPassword, dispatch]
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <AuthLogo className="mb-6" />
        <h1 className="mb-1 text-center text-[22px] font-semibold text-slate-900">
          Create account
        </h1>
        <p className="mb-6 text-center text-[15px] text-slate-500">
          Enter your details to get started.
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="space-y-4">
            <FormField
              label="Name"
              required
              type="text"
              value={values.name}
              onChange={(text) => updateField('name', text)}
              placeholder="Your name"
              error={errors.name}
              autoComplete="name"
            />
            <FormField
              label="Email"
              required
              type="email"
              value={values.email}
              onChange={(text) => updateField('email', text)}
              placeholder="you@example.com"
              error={errors.email}
              autoComplete="email"
            />
            <FormField
              label="Password"
              required
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={(text) => updateField('password', text)}
              placeholder="At least 6 characters"
              error={errors.password}
              autoComplete="new-password"
              rightElement={
                <Icon
                  name={showPassword ? 'eye-slash' : 'eye'}
                  className="h-5 w-5"
                />
              }
              onRightElementClick={() => setShowPassword(!showPassword)}
            />
            <FormField
              label="Confirm password"
              required
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={updateConfirmPassword}
              placeholder="Re-enter your password"
              error={errors.confirmPassword}
              autoComplete="new-password"
              rightElement={
                <Icon
                  name={showConfirmPassword ? 'eye-slash' : 'eye'}
                  className="h-5 w-5"
                />
              }
              onRightElementClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            {authError && (
              <div
                className="rounded-lg border-[1.5px] border-red-600 bg-red-600/10 p-3"
                role="alert"
                aria-live="polite"
              >
                <p className="text-[14px] leading-5 text-red-600">{authError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-blue-800 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900 disabled:bg-blue-800/70"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
              ) : (
                'Create account'
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center">
          <Link
            to="/login"
            className="text-[15px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Already have an account? Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
