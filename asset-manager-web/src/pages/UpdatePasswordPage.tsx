import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  reauthenticateAndUpdatePassword,
  logPasswordChanged,
} from '../services/firebase/authService';
import { FormField } from '../components/auth/FormField';
import { Icon } from '../components/shared/Icon';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | undefined
  >();
  const [newPasswordError, setNewPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | undefined
  >();

  const validateForm = useCallback((): boolean => {
    let isValid = true;
    setCurrentPasswordError(undefined);
    setNewPasswordError(undefined);
    setConfirmPasswordError(undefined);

    if (!currentPassword.trim()) {
      setCurrentPasswordError('Current password is required');
      isValid = false;
    }
    if (!newPassword.trim()) {
      setNewPasswordError('New password is required');
      isValid = false;
    } else if (newPassword.length < 6) {
      setNewPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else if (newPassword === currentPassword) {
      setNewPasswordError('New password must be different from current password');
      isValid = false;
    }
    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your new password');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords don't match");
      isValid = false;
    }
    return isValid;
  }, [currentPassword, newPassword, confirmPassword]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setShowSuccess(false);
    setCurrentPasswordError(undefined);
    setNewPasswordError(undefined);
    setConfirmPasswordError(undefined);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await reauthenticateAndUpdatePassword(currentPassword, newPassword);
      await logPasswordChanged();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setShowSuccess(true);
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err: unknown) {
      const errObj = err as { message?: string; code?: string };
      const errorMessage =
        errObj?.message || 'Failed to update password. Please try again.';
      setError(errorMessage);

      if (
        errObj?.code === 'auth/wrong-password' ||
        errObj?.message?.includes('password')
      ) {
        setCurrentPasswordError('Current password is incorrect');
      } else if (errObj?.code === 'auth/weak-password') {
        setNewPasswordError('Password must be at least 6 characters');
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPassword,
    newPassword,
    confirmPassword,
    validateForm,
    navigate,
  ]);

  return (
    <div className="flex flex-col">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <Link
          to="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Go back to profile"
        >
          <Icon name="arrow-left" className="h-6 w-6" />
        </Link>
        <h1 className="flex-1 text-center text-[22px] font-semibold text-slate-900">
          Update Password
        </h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="rounded-[10px] border border-slate-200 bg-white p-4">
          <div className="space-y-4">
            <FormField
              label="Current Password"
              required
              value={currentPassword}
              onChange={(v) => {
                setCurrentPassword(v);
                if (currentPasswordError) setCurrentPasswordError(undefined);
              }}
              placeholder="Enter your current password"
              type={showCurrentPassword ? 'text' : 'password'}
              error={currentPasswordError}
              rightElement={
                showCurrentPassword ? (
                  <Icon name="eye-slash" className="h-5 w-5" />
                ) : (
                  <Icon name="eye" className="h-5 w-5" />
                )
              }
              onRightElementClick={() =>
                setShowCurrentPassword(!showCurrentPassword)
              }
            />

            <FormField
              label="New Password"
              required
              value={newPassword}
              onChange={(v) => {
                setNewPassword(v);
                if (newPasswordError) setNewPasswordError(undefined);
                if (confirmPassword && v === confirmPassword && confirmPasswordError) {
                  setConfirmPasswordError(undefined);
                }
              }}
              placeholder="Enter your new password"
              type={showNewPassword ? 'text' : 'password'}
              error={newPasswordError}
              rightElement={
                showNewPassword ? (
                  <Icon name="eye-slash" className="h-5 w-5" />
                ) : (
                  <Icon name="eye" className="h-5 w-5" />
                )
              }
              onRightElementClick={() => setShowNewPassword(!showNewPassword)}
            />

            <FormField
              label="Confirm New Password"
              required
              value={confirmPassword}
              onChange={(v) => {
                setConfirmPassword(v);
                if (confirmPasswordError) setConfirmPasswordError(undefined);
              }}
              placeholder="Confirm your new password"
              type={showConfirmPassword ? 'text' : 'password'}
              error={confirmPasswordError}
              rightElement={
                showConfirmPassword ? (
                  <Icon name="eye-slash" className="h-5 w-5" />
                ) : (
                  <Icon name="eye" className="h-5 w-5" />
                )
              }
              onRightElementClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            />

            {showSuccess && (
              <div
                className="rounded-lg border border-green-600/20 bg-green-600/10 p-3"
                role="status"
              >
                <div className="flex items-center gap-2">
                  <Icon name="check-circle" className="h-5 w-5 text-green-600" />
                  <span className="text-[13px] text-green-600">
                    Password updated successfully
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div
                className="rounded-lg border border-red-600/20 bg-red-600/10 p-3"
                role="alert"
              >
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className={`flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] font-semibold text-white transition-colors ${
                isLoading ? 'bg-blue-800/70' : 'bg-blue-800'
              } hover:bg-blue-900 disabled:opacity-70`}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
