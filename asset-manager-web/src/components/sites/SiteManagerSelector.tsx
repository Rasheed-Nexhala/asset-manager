import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribeToSiteManagers } from '../../services/firebase/userRoleService';
import { findSiteByManagerId } from '../../services/firebase/siteService';
import { ManagerReassignmentConfirmationModal } from './ManagerReassignmentConfirmationModal';
import type { UserListItem } from '../../types/roles';
import type { Site } from '../../types/sites';
import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';

export interface SiteManagerSelectorProps {
  value: string | null;
  onChange: (managerId: string | null) => void;
  excludeSiteId?: string;
  error?: string;
}

export function SiteManagerSelector({
  value,
  onChange,
  excludeSiteId,
  error,
}: SiteManagerSelectorProps) {
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [pendingManagerId, setPendingManagerId] = useState<string | null>(null);
  const [conflictingSite, setConflictingSite] = useState<Site | null>(null);
  const [checkingAssignment, setCheckingAssignment] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSiteManagers((managersList) => {
      const siteManagers = managersList.filter(
        (user) => user.isActive && !user.isDeleted
      );
      setManagers(siteManagers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSelect = useCallback(
    async (managerId: string | null) => {
      if (managerId === null || managerId === value) {
        onChange(managerId);
        setModalVisible(false);
        return;
      }

      try {
        setCheckingAssignment(true);
        const existingSite = await findSiteByManagerId(managerId, excludeSiteId);
        if (existingSite) {
          setPendingManagerId(managerId);
          setConflictingSite(existingSite);
          setConfirmationVisible(true);
          setModalVisible(false);
        } else {
          onChange(managerId);
          setModalVisible(false);
        }
      } catch (err) {
        console.error('Error checking manager assignment:', err);
        onChange(managerId);
        setModalVisible(false);
      } finally {
        setCheckingAssignment(false);
      }
    },
    [onChange, value, excludeSiteId]
  );

  const handleConfirmReassignment = useCallback(() => {
    if (pendingManagerId !== null) onChange(pendingManagerId);
    setConfirmationVisible(false);
    setPendingManagerId(null);
    setConflictingSite(null);
  }, [onChange, pendingManagerId]);

  const handleCancelReassignment = useCallback(() => {
    setConfirmationVisible(false);
    setPendingManagerId(null);
    setConflictingSite(null);
  }, []);

  const selectedManager = value ? managers.find((m) => m.id === value) : null;
  const displayText = selectedManager
    ? selectedManager.displayName || selectedManager.email || 'Unknown'
    : 'Select Manager';

  const pendingManagerName = useMemo(() => {
    if (!pendingManagerId) return 'This manager';
    const manager = managers.find((m) => m.id === pendingManagerId);
    return manager?.displayName || manager?.email || 'This manager';
  }, [pendingManagerId, managers]);

  const hasError = Boolean(error);

  return (
    <div className="space-y-1.5">
      <label className="block text-[15px] font-medium text-slate-900">
        Site Manager (Optional)
      </label>
      <button
        type="button"
        onClick={() => setModalVisible(true)}
        className={`flex h-12 w-full items-center justify-between rounded-lg border bg-white px-4 ${
          hasError ? 'border-red-600' : 'border-slate-200'
        }`}
        aria-label={`Select site manager. Current: ${displayText}`}
      >
        {loading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <span
            className={`text-[15px] ${value ? 'text-slate-900' : 'text-slate-400'}`}
          >
            {displayText}
          </span>
        )}
        <Icon name="chevron-down" className="h-5 w-5 text-slate-500" />
      </button>
      {error ? (
        <p className="text-[13px] text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <div className="flex items-center gap-1">
          <Icon name="question-mark-circle" className="h-[18px] w-[18px] text-slate-500" />
          <span className="text-[13px] text-slate-500">Can be assigned later</span>
        </div>
      )}

      {/* Manager selection modal */}
      {modalVisible && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 md:items-center"
          aria-modal
          aria-labelledby="site-manager-modal-title"
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl md:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
            <h2
              id="site-manager-modal-title"
              className="mb-4 text-[22px] font-semibold text-slate-900"
            >
              Select Site Manager
            </h2>

            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`flex h-12 w-full items-center justify-between rounded-lg border px-4 ${
                  value === null
                    ? 'border-blue-800 bg-blue-800/10'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <span
                  className={`text-[15px] font-medium ${
                    value === null ? 'text-blue-800' : 'text-slate-900'
                  }`}
                >
                  Not Assigned
                </span>
                {value === null && (
                  <Icon name="check" className="h-5 w-5 text-blue-800" />
                )}
              </button>

              {loading || checkingAssignment ? (
                <div className="flex flex-col items-center py-8">
                  <LoadingSpinner size="lg" />
                  <span className="mt-4 text-[15px] text-slate-500">
                    {loading ? 'Loading managers...' : 'Checking assignment...'}
                  </span>
                </div>
              ) : managers.length === 0 ? (
                <p className="py-8 text-center text-[15px] text-slate-500">
                  No Site Managers available
                </p>
              ) : (
                managers.map((manager) => {
                  const isSelected = value === manager.id;
                  const displayName =
                    manager.displayName || manager.email || 'Unknown';
                  return (
                    <button
                      key={manager.id}
                      type="button"
                      onClick={() => handleSelect(manager.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 ${
                        isSelected
                          ? 'border-blue-800 bg-blue-800/10'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <span
                          className={`text-[15px] font-medium ${
                            isSelected ? 'text-blue-800' : 'text-slate-900'
                          }`}
                        >
                          {displayName}
                        </span>
                        {manager.email && manager.displayName && (
                          <p className="text-[13px] text-slate-500">
                            {manager.email}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Icon name="check" className="h-5 w-5 text-blue-800" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setModalVisible(false)}
              className="mt-4 h-[50px] w-full rounded-[10px] border-[1.5px] border-blue-800 font-semibold text-blue-800 transition-colors hover:bg-blue-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ManagerReassignmentConfirmationModal
        visible={confirmationVisible}
        managerName={pendingManagerName}
        siteName={conflictingSite?.name || 'another site'}
        onConfirm={handleConfirmReassignment}
        onCancel={handleCancelReassignment}
      />
    </div>
  );
}
