import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signOutUser } from '../store/slices/authSlice';
import {
  selectAuthLoading,
  selectUserDisplayName,
  selectUserEmail,
  selectUserId,
  selectUserRoleType,
  selectIsActive,
  selectUserPermissions,
} from '../store/selectors/authSelectors';
import { selectAssignedSiteIdForUser, selectSiteById } from '../store/selectors/sitesSelectors';
import type { RootState } from '../store';
import { useMemo } from 'react';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const displayName = useAppSelector(selectUserDisplayName);
  const email = useAppSelector(selectUserEmail);
  const userId = useAppSelector(selectUserId);
  const role = useAppSelector(selectUserRoleType);
  const isActive = useAppSelector(selectIsActive);
  const permissions = useAppSelector(selectUserPermissions);

  const assignedSiteId = useAppSelector(selectAssignedSiteIdForUser(userId));
  const assignedSiteSelector = useMemo(
    () =>
      assignedSiteId
        ? selectSiteById(assignedSiteId)
        : (_state: RootState) => null,
    [assignedSiteId]
  );
  const assignedSite = useAppSelector(assignedSiteSelector);
  const siteName = assignedSite?.name ?? null;

  const handleLogout = useCallback(async () => {
    try {
      await dispatch(signOutUser()).unwrap();
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [dispatch]);

  return (
    <div className="flex flex-col">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <h1 className="text-[22px] font-semibold text-slate-900">Profile</h1>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-70"
          aria-label={isLoading ? 'Signing out, please wait' : 'Sign out'}
        >
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            'Sign out'
          )}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <section
          className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6"
          aria-label="User profile"
        >
          <h2 className="mb-4 text-[17px] font-semibold text-slate-900">
            User Information
          </h2>

          <div className="space-y-4">
            {displayName && (
              <div>
                <p className="mb-1 text-[13px] text-slate-500">Name</p>
                <p className="text-[15px] text-slate-900">{displayName}</p>
              </div>
            )}

            {email && (
              <div>
                <p className="mb-1 text-[13px] text-slate-500">Email</p>
                <p className="text-[15px] text-slate-900">{email}</p>
              </div>
            )}

            {userId && (
              <div>
                <p className="mb-1 text-[13px] text-slate-500">User ID</p>
                <p className="font-mono text-[13px] text-slate-500">{userId}</p>
              </div>
            )}

            {role && (
              <div>
                <p className="mb-1 text-[13px] text-slate-500">Role</p>
                <p className="text-[15px] font-semibold text-slate-900">
                  {role}
                </p>
              </div>
            )}

            {siteName && (
              <div>
                <p className="mb-1 text-[13px] text-slate-500">Assigned Site</p>
                <p className="text-[15px] text-slate-900">{siteName}</p>
              </div>
            )}

            <div>
              <p className="mb-1 text-[13px] text-slate-500">Status</p>
              <p
                className={`text-[15px] ${
                  isActive ? 'text-green-600' : 'text-red-600'
                }`}
                aria-label={isActive ? 'Active' : 'Inactive'}
              >
                {isActive ? 'Active' : 'Inactive'}
              </p>
            </div>

            {permissions.length > 0 && (
              <div>
                <p className="mb-1 text-[13px] text-slate-500">Permissions</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded bg-blue-500/10 px-2 py-1 text-[12px] font-medium text-blue-600"
                      aria-label={`Permission: ${perm}`}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-4 border-t border-slate-200 pt-4">
            <Link
              to="/profile/update-password"
              className="flex h-[50px] w-full items-center justify-center rounded-[10px] border-[1.5px] border-blue-800 font-semibold text-blue-800 transition-colors hover:bg-blue-50"
            >
              Update Password
            </Link>
            <Link
              to="/profile/delete-account"
              className="flex h-[50px] w-full items-center justify-center rounded-[10px] border-[1.5px] border-red-600 font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Delete Account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
