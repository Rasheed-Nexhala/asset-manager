import { useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signInUser, clearError } from '../store/slices/authSlice';
import { selectAuthLoading, selectAuthError, selectIsAuthenticated } from '../store/selectors/authSelectors';
import { validateLoginForm } from '../utils/authValidation';
import type { AuthFormValues, AuthFormErrors } from '../types/auth';
import { AuthLogo } from '../components/auth/AuthLogo';
import { FormField } from '../components/auth/FormField';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useState } from 'react';

const defaultValues: AuthFormValues = {
  name: '',
  email: '',
  password: '',
};

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isLoading = useAppSelector(selectAuthLoading);
  const authError = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [values, setValues] = useState<AuthFormValues>(defaultValues);
  const [errors, setErrors] = useState<AuthFormErrors>({});

  // Redirect when authenticated (e.g. after successful login)
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Auto-dismiss auth error: longer for deactivated (15s), 5s for others
  const dismissMs = (authError?.toLowerCase() ?? '').includes('deactivated') ? 15000 : 5000;
  useEffect(() => {
    if (!authError) return;
    const timer = setTimeout(() => dispatch(clearError()), dismissMs);
    return () => clearTimeout(timer);
  }, [authError, dismissMs, dispatch]);

  const updateField = useCallback(
    (field: keyof AuthFormValues, text: string) => {
      setValues((prev) => ({ ...prev, [field]: text }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      if (authError) dispatch(clearError());
    },
    [authError, dispatch]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const nextErrors = validateLoginForm(values);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;

      const trimmedEmail = values.email.trim();
      const trimmedPassword = values.password;

      try {
        await dispatch(signInUser({ email: trimmedEmail, password: trimmedPassword })).unwrap();
      } catch {
        // Error handled in Redux, displayed via authError
      }
    },
    [values, dispatch]
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <AuthLogo className="mb-6" />
        <h1 className="mb-1 text-center text-[22px] font-semibold text-slate-900">
          Welcome back
        </h1>
        <p className="mb-6 text-center text-[15px] text-slate-500">
          Enter your email and password to continue.
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="space-y-4">
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
              type="password"
              value={values.password}
              onChange={(text) => updateField('password', text)}
              placeholder="Your password"
              error={errors.password}
              autoComplete="current-password"
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
                <>
                  <LoadingSpinner size="sm" className="border-white border-t-transparent" />
                  <span>Please wait…</span>
                </>
              ) : (
                'Log in'
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center">
          <Link
            to="/signup"
            className="text-[15px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Don&apos;t have an account? Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
