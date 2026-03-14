import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { deleteAccountUser } from '../store/slices/authSlice';
import { FormField } from '../components/auth/FormField';
import { Icon } from '../components/shared/Icon';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function DeleteAccountPage() {
  const dispatch = useAppDispatch();
  const [currentPassword, setCurrentPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | undefined
  >();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const validateForm = useCallback((): boolean => {
    setCurrentPasswordError(undefined);
    if (!currentPassword.trim()) {
      setCurrentPasswordError('Current password is required');
      return false;
    }
    return true;
  }, [currentPassword]);

  const handleDeleteClick = useCallback(() => {
    setError(null);
    setCurrentPasswordError(undefined);
    if (!validateForm()) return;
    setConfirmOpen(true);
  }, [validateForm]);

  const handleConfirmDelete = useCallback(async () => {
    setError(null);
    setCurrentPasswordError(undefined);
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await dispatch(deleteAccountUser(currentPassword)).unwrap();
      // Auth state change will redirect to login
    } catch (err: unknown) {
      const errObj = err as { message?: string; code?: string };
      const errorMessage =
        errObj?.message || 'Account deletion failed. Please try again.';
      setError(errorMessage);

      if (
        errObj?.code === 'auth/wrong-password' ||
        errObj?.message?.includes('password')
      ) {
        setCurrentPasswordError('Current password is incorrect');
      }
    } finally {
      setIsLoading(false);
      setConfirmOpen(false);
    }
  }, [currentPassword, validateForm, dispatch]);

  const handleCancelConfirm = useCallback(() => {
    setConfirmOpen(false);
  }, []);

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
          Delete Account
        </h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="rounded-[10px] border border-slate-200 bg-white p-4">
          <div className="space-y-4">
            <p className="mb-1 text-[15px] text-slate-500">
              Enter your current password to confirm account deletion. This
              action cannot be undone.
            </p>

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
              onClick={handleDeleteClick}
              disabled={isLoading}
              className={`flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] font-semibold text-white transition-colors ${
                isLoading ? 'bg-red-600/70' : 'bg-red-600'
              } hover:bg-red-700 disabled:opacity-70`}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Please wait…
                </>
              ) : (
                <>
                  <Icon name="trash" className="h-5 w-5" />
                  Delete Account
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="alertdialog"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex justify-center">
              <Icon name="exclamation-triangle" className="h-16 w-16 text-red-600" />
            </div>
            <h2
              id="delete-confirm-title"
              className="mb-3 text-center text-[20px] font-semibold text-slate-900"
            >
              Delete Account
            </h2>
            <p className="mb-6 text-center text-[15px] leading-6 text-slate-500">
              Are you sure you want to permanently delete your account? This
              action cannot be undone. All your data will be removed.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isLoading}
                className="flex h-[50px] w-full items-center justify-center rounded-[10px] bg-red-600 font-semibold text-white hover:bg-red-700 disabled:opacity-70"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'Delete'}
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={isLoading}
                className="h-[50px] w-full rounded-[10px] border-[1.5px] border-slate-500 font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
