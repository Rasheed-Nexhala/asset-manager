import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAutoClearError } from '../hooks/useAutoClearError';
import {
  subscribeToAllUsers,
  updateUserRole,
  updateUserActiveStatus,
} from '../services/firebase/userRoleService';
import { useAppSelector } from '../store/hooks';
import { selectIsSuperAdmin, selectUserId } from '../store/selectors/authSelectors';
import type { UserListItem, UserRole } from '../types/roles';
import { Icon } from '../components/shared/Icon';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { clsx } from 'clsx';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'Admin', label: 'Admin' },
  { value: 'StoreIncharge', label: 'Store Incharge' },
  { value: 'SiteManager', label: 'Site Manager' },
  { value: 'Unassigned', label: 'Unassigned' },
];

interface PendingChanges {
  role?: UserRole;
  isActive?: boolean;
}

export function UsersPage() {
  const currentUserId = useAppSelector(selectUserId);
  const isCurrentUserSuperAdmin = useAppSelector(selectIsSuperAdmin);

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserCurrentRole, setSelectedUserCurrentRole] =
    useState<UserRole | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, PendingChanges>
  >({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToAllUsers((usersList) => {
      setUsers(usersList);
      setLoading(false);
      setError(null);
    });
    return () => unsubscribe();
  }, []);

  useAutoClearError(error, () => setError(null));

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const aActive = a.isActive && !a.isDeleted;
        const bActive = b.isActive && !b.isDeleted;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        const aDeleted = a.isDeleted ?? false;
        const bDeleted = b.isDeleted ?? false;
        if (!aDeleted && bDeleted) return -1;
        if (aDeleted && !bDeleted) return 1;
        return 0;
      }),
    [users]
  );

  const getCurrentUserValue = useCallback(
    (userId: string, field: 'role' | 'isActive') => {
      const user = users.find((u) => u.id === userId);
      if (!user) return null;
      const pending = pendingChanges[userId];
      if (field === 'role') return pending?.role ?? user.role;
      return pending?.isActive ?? user.isActive;
    },
    [users, pendingChanges]
  );

  const hasPendingChanges = useCallback(
    (userId: string) =>
      pendingChanges[userId] &&
      Object.keys(pendingChanges[userId]).length > 0,
    [pendingChanges]
  );

  const isUserReadOnly = useCallback(
    (user: UserListItem) =>
      user.isDeleted === true ||
      (user.role === 'Admin' && !isCurrentUserSuperAdmin) ||
      (user.id === currentUserId && isCurrentUserSuperAdmin),
    [isCurrentUserSuperAdmin, currentUserId]
  );

  const handleRoleSelectPress = useCallback(
    (user: UserListItem) => {
      if (isUserReadOnly(user)) return;
      const currentRole = getCurrentUserValue(user.id, 'role') as UserRole;
      setSelectedUserId(user.id);
      setSelectedUserCurrentRole(currentRole);
      setRoleModalVisible(true);
    },
    [getCurrentUserValue, isUserReadOnly]
  );

  const handleRoleChange = useCallback(
    (newRole: UserRole) => {
      if (selectedUserId) {
        setPendingChanges((prev) => ({
          ...prev,
          [selectedUserId]: { ...prev[selectedUserId], role: newRole },
        }));
      }
      setRoleModalVisible(false);
      setSelectedUserId(null);
      setSelectedUserCurrentRole(null);
    },
    [selectedUserId]
  );

  const handleActiveStatusChange = useCallback(
    (user: UserListItem, newIsActive: boolean) => {
      if (isUserReadOnly(user)) return;
      setPendingChanges((prev) => ({
        ...prev,
        [user.id]: { ...prev[user.id], isActive: newIsActive },
      }));
    },
    [isUserReadOnly]
  );

  const handleSaveChanges = useCallback(
    async (user: UserListItem) => {
      if (isUserReadOnly(user)) return;
      const changes = pendingChanges[user.id];
      if (!changes || Object.keys(changes).length === 0) return;

      setSavingUserId(user.id);
      setError(null);

      try {
        if (changes.role !== undefined) {
          await updateUserRole(user.id, changes.role);
        }
        if (changes.isActive !== undefined) {
          await updateUserActiveStatus(user.id, changes.isActive);
        }
        setPendingChanges((prev) => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to save changes'
        );
        setPendingChanges((prev) => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
      } finally {
        setSavingUserId(null);
      }
    },
    [pendingChanges, isUserReadOnly]
  );

  const handleCancelChanges = useCallback((userId: string) => {
    setPendingChanges((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col">
        <header className="flex h-14 items-center border-b border-slate-200 bg-white px-4">
          <h1 className="text-[22px] font-semibold text-slate-900">Users</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-[15px] text-slate-500">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex flex-col">
        <header className="flex h-14 items-center border-b border-slate-200 bg-white px-4">
          <h1 className="text-[22px] font-semibold text-slate-900">Users</h1>
        </header>
        <div className="rounded-[10px] border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-[17px] font-semibold text-slate-900">Users</h2>
          <p className="mb-4 text-[13px] text-red-600">{error}</p>
          <p className="text-[13px] text-slate-500">
            Real-time listener will automatically reconnect. Please wait or
            refresh the app.
          </p>
        </div>
      </div>
    );
  }

  if (!loading && users.length === 0) {
    return (
      <div className="flex flex-col">
        <header className="flex h-14 items-center border-b border-slate-200 bg-white px-4">
          <h1 className="text-[22px] font-semibold text-slate-900">Users</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <Icon name="users" className="mb-4 h-16 w-16 text-slate-500" />
          <h2 className="mb-2 text-center text-[22px] font-semibold text-slate-900">
            No Users Found
          </h2>
          <p className="mb-6 text-center text-[15px] text-slate-500">
            There are no users in the system yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="flex h-14 items-center border-b border-slate-200 bg-white px-4">
        <h1 className="text-[22px] font-semibold text-slate-900">Users</h1>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-lg bg-amber-600/15 px-4 py-2">
          <p className="text-[13px] text-amber-600">{error}</p>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider text-center">Active Status</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedUsers.map((user) => {
                const isReadOnly = isUserReadOnly(user);
                const isSaving = savingUserId === user.id;
                const hasChanges = hasPendingChanges(user.id);
                const currentRole = getCurrentUserValue(user.id, 'role') as UserRole;
                const currentIsActive = getCurrentUserValue(user.id, 'isActive') as boolean;
                const effectiveIsActive = user.isDeleted ? false : currentIsActive;
                const displayName = user.displayName || user.email || 'Unknown User';
                const email = user.email && user.displayName ? user.email : null;

                return (
                  <tr key={user.id} className={clsx("hover:bg-slate-50/50 transition-colors", hasChanges && "bg-blue-50/30")}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[15px] font-semibold text-slate-900 line-clamp-1">{displayName}</span>
                        {email && <span className="text-[13px] text-slate-500 line-clamp-1">{email}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleRoleSelectPress(user)}
                        disabled={isSaving || isReadOnly}
                        className={clsx(
                          "flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[14px] text-slate-900 transition-all",
                          (isSaving || isReadOnly) ? "opacity-50 cursor-not-allowed" : "hover:border-blue-300 hover:shadow-sm"
                        )}
                      >
                        {currentRole}
                        {!isReadOnly && <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={effectiveIsActive}
                          disabled={isSaving || isReadOnly}
                          onClick={() => handleActiveStatusChange(user, !effectiveIsActive)}
                          className={clsx(
                            "relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-2",
                            effectiveIsActive ? 'bg-blue-800' : 'bg-slate-200',
                            (isSaving || isReadOnly) && "opacity-50"
                          )}
                        >
                          <span
                            className={clsx(
                              "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
                              effectiveIsActive ? 'left-6' : 'left-1'
                            )}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {hasChanges && !isReadOnly ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleCancelChanges(user.id)}
                            disabled={isSaving}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Cancel changes"
                          >
                            <Icon name="x-mark" className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleSaveChanges(user)}
                            disabled={isSaving}
                            className="flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-[14px] font-semibold text-white hover:bg-blue-900 shadow-sm"
                          >
                            {isSaving ? <LoadingSpinner size="sm" /> : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <span className={clsx(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium",
                          user.isDeleted ? "bg-slate-100 text-slate-500" : effectiveIsActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {user.isDeleted ? 'Deleted' : effectiveIsActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sortedUsers.map((user) => {
            const isReadOnly = isUserReadOnly(user);
            const isTargetDeleted = user.isDeleted === true;
            const isSaving = savingUserId === user.id;
            const hasChanges = hasPendingChanges(user.id);
            const currentRole = getCurrentUserValue(user.id, 'role') as UserRole;
            const currentIsActive = getCurrentUserValue(
              user.id,
              'isActive'
            ) as boolean;
            const effectiveIsActive = isTargetDeleted ? false : currentIsActive;
            const displayName = user.displayName || user.email || 'Unknown User';
            const email =
              user.email && user.displayName ? user.email : null;

            return (
              <div
                key={user.id}
                className={clsx(
                  "rounded-[10px] border p-4 bg-white transition-all",
                  hasChanges ? 'border-blue-800 ring-1 ring-blue-800' : 'border-slate-200',
                  isReadOnly && 'opacity-90'
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="line-clamp-1 text-[15px] font-semibold text-slate-900">
                      {displayName}
                    </p>
                    {email && (
                      <p className="mt-1 line-clamp-1 text-[13px] text-slate-500">
                        {email}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[12px] font-medium ${
                      user.isDeleted
                        ? 'bg-slate-500/15 text-slate-500'
                        : effectiveIsActive
                          ? 'bg-green-600/15 text-green-600'
                          : 'bg-red-600/15 text-red-600'
                    }`}
                  >
                    {user.isDeleted
                      ? 'Deleted'
                      : effectiveIsActive
                        ? 'Active'
                        : 'Inactive'}
                  </span>
                </div>

                <div className="mb-3">
                  <label className="mb-1.5 block text-[13px] text-slate-500">
                    Role
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRoleSelectPress(user)}
                    disabled={isSaving || isReadOnly}
                    className={`flex h-12 w-full items-center justify-between rounded-lg border px-4 ${
                      isSaving || isReadOnly
                        ? 'border-slate-200 bg-slate-50 opacity-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <span className="text-[15px] text-slate-900">
                      {currentRole}
                    </span>
                    {!isReadOnly && (
                      <Icon name="chevron-down" className="h-5 w-5 text-slate-500" />
                    )}
                  </button>
                  {isReadOnly && (
                    <p className="mt-1.5 text-[12px] text-slate-500">
                      {isTargetDeleted
                        ? 'Deleted users cannot be modified'
                        : user.id === currentUserId
                          ? 'You cannot modify your own account'
                          : 'Admin users cannot be modified'}
                    </p>
                  )}
                </div>

                <div className="mb-3 flex items-center justify-between border-t border-slate-200 pt-3">
                  <div>
                    <p className="mb-1 text-[13px] text-slate-500">
                      Active Status
                    </p>
                    <p
                      className={`text-[15px] ${
                        effectiveIsActive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {effectiveIsActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={effectiveIsActive}
                    disabled={isSaving || isReadOnly}
                    onClick={() =>
                      handleActiveStatusChange(user, !effectiveIsActive)
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-2 disabled:opacity-50 ${
                      effectiveIsActive ? 'bg-blue-800' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        effectiveIsActive ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {hasChanges && !isReadOnly && (
                  <div className="flex gap-3 border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={() => handleCancelChanges(user.id)}
                      disabled={isSaving}
                      className="flex-1 rounded-[10px] border-[1.5px] border-slate-200 py-3 font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveChanges(user)}
                      disabled={isSaving}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] py-3 font-semibold text-white ${
                        isSaving ? 'bg-blue-800/70' : 'bg-blue-800'
                      } hover:bg-blue-900 disabled:opacity-70`}
                    >
                      {isSaving ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Please wait…
                        </>
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Role selection modal */}
      {roleModalVisible && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 md:items-center"
          aria-modal
          aria-labelledby="role-modal-title"
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl md:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
            <h2
              id="role-modal-title"
              className="mb-4 text-[22px] font-semibold text-slate-900"
            >
              Select Role
            </h2>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleRoleChange(option.value)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 ${
                    selectedUserCurrentRole === option.value
                      ? 'border-blue-800 bg-blue-800/10'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <span
                    className={`text-[15px] font-medium ${
                      selectedUserCurrentRole === option.value
                        ? 'text-blue-800'
                        : 'text-slate-900'
                    }`}
                  >
                    {option.label}
                  </span>
                  {selectedUserCurrentRole === option.value && (
                    <Icon name="check" className="h-5 w-5 text-blue-800" />
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setRoleModalVisible(false);
                setSelectedUserId(null);
                setSelectedUserCurrentRole(null);
              }}
              className="mt-4 h-[50px] w-full rounded-[10px] border-[1.5px] border-blue-800 font-semibold text-blue-800 hover:bg-blue-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
