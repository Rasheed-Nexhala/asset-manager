import { useEffect, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  fetchPendingRequests,
  approveInventoryUpdateRequest,
  rejectInventoryUpdateRequest,
  revokeInventoryUpdateAccess,
  restoreInventoryUpdateAccess,
} from '../../store/thunks/inventoryUpdateRequestThunks';
import {
  selectPendingRequests,
  selectActiveApprovedRequests,
  selectInventoryUpdateRequestLoading,
  selectInventoryUpdateRequestError,
} from '../../store/selectors/inventoryUpdateRequestSelectors';
import { selectIsAdmin } from '../../store/selectors/authSelectors';
import { clearError } from '../../store/slices/inventoryUpdateRequestSlice';
import type { InventoryUpdateRequest } from '../../types/inventoryUpdateRequest';
import { Icon } from '../../components/shared/Icon';
import { InventoryUpdateRequestCard } from '../../components/inventory/InventoryUpdateRequestCard';
import { ActiveAccessCard } from '../../components/inventory/ActiveAccessCard';
import { InventoryLoadingState } from '../../components/shared/InventoryLoadingState';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';

export function InventoryUpdateRequestsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [requestToReject, setRequestToReject] = useState<InventoryUpdateRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const pendingRequests = useAppSelector(selectPendingRequests);
  const activeApprovedRequests = useAppSelector(selectActiveApprovedRequests);
  const activeAccessRequests = useMemo(
    () => activeApprovedRequests.filter((r) => !r.accessRevoked),
    [activeApprovedRequests]
  );
  const inactiveAccessRequests = useMemo(
    () => activeApprovedRequests.filter((r) => r.accessRevoked),
    [activeApprovedRequests]
  );
  const isLoading = useAppSelector(selectInventoryUpdateRequestLoading);
  const error = useAppSelector(selectInventoryUpdateRequestError);
  const isAdmin = useAppSelector(selectIsAdmin);

  useEffect(() => {
    if (isAdmin) dispatch(fetchPendingRequests());
  }, [dispatch, isAdmin]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchPendingRequests());
    setTimeout(() => setRefreshing(false), 800);
  }, [dispatch]);

  const handleApprove = useCallback(
    async (requestId: string) => {
      setApprovingId(requestId);
      try {
        await dispatch(
          approveInventoryUpdateRequest({ requestId, expiresInHours: 24 })
        ).unwrap();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Failed to approve request');
      } finally {
        setApprovingId(null);
      }
    },
    [dispatch]
  );

  const handleRejectPress = useCallback((request: InventoryUpdateRequest) => {
    setRequestToReject(request);
    setRejectionReason('');
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!requestToReject) return;
    const reason = rejectionReason.trim() || 'Rejected by Admin';
    setRejectingId(requestToReject.id);
    try {
      await dispatch(
        rejectInventoryUpdateRequest({
          requestId: requestToReject.id,
          rejectionReason: reason,
        })
      ).unwrap();
      setRequestToReject(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setRejectingId(null);
    }
  }, [dispatch, requestToReject, rejectionReason]);

  const handleRejectCancel = useCallback(() => {
    setRequestToReject(null);
    setRejectionReason('');
  }, []);

  const handleAccessToggle = useCallback(
    async (requestId: string, revoke: boolean) => {
      setTogglingId(requestId);
      try {
        if (revoke) {
          await dispatch(revokeInventoryUpdateAccess(requestId)).unwrap();
        } else {
          await dispatch(restoreInventoryUpdateAccess(requestId)).unwrap();
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Failed to update access');
      } finally {
        setTogglingId(null);
      }
    },
    [dispatch]
  );

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
          <button type="button" onClick={handleBack} className="w-12 h-12 -ml-2 flex items-center justify-center" aria-label="Go back">
            <Icon name="arrow-left" className="w-6 h-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900 flex-1">Inventory Update Requests</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="lock-closed" className="w-12 h-12 text-slate-400" />
          <h2 className="text-[17px] font-semibold text-slate-900 mt-4 text-center">Admin Only</h2>
          <p className="text-[15px] text-slate-500 mt-2 text-center">
            This screen is only available to Admin users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
        <button type="button" onClick={handleBack} className="w-12 h-12 -ml-2 flex items-center justify-center" aria-label="Go back">
          <Icon name="arrow-left" className="w-6 h-6" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900 flex-1">Inventory Update Requests</h1>
      </header>

      {error && (
        <div className="bg-red-600/15 px-4 py-3 mx-4 mt-4 rounded-lg flex items-center gap-3">
          <Icon name="exclamation-circle" className="w-6 h-6 text-red-600" />
          <p className="text-[15px] text-red-600 flex-1">{error}</p>
          <button
            type="button"
            onClick={() => dispatch(clearError())}
            aria-label="Dismiss error"
          >
            <Icon name="x-mark" className="w-5 h-5 text-red-600" />
          </button>
        </div>
      )}

      {isLoading && pendingRequests.length === 0 && activeApprovedRequests.length === 0 ? (
        <InventoryLoadingState message="Loading requests..." />
      ) : pendingRequests.length === 0 && activeApprovedRequests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="document-text" className="w-20 h-20 text-slate-400" />
          <h2 className="text-[22px] font-semibold text-slate-900 mt-4 text-center">
            No pending requests
          </h2>
          <p className="text-[15px] text-slate-500 mt-2 text-center">
            All inventory update requests have been processed.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-24">
          {activeAccessRequests.length > 0 && (
            <div className="px-4 pt-4">
              <h3 className="text-[17px] font-semibold text-slate-900 mb-3">Active Access</h3>
              <p className="text-[13px] text-slate-500 mb-3">Toggle off to revoke access.</p>
              <div className="flex flex-col gap-3">
                {activeAccessRequests.map((req) => (
                  <ActiveAccessCard
                    key={req.id}
                    request={req}
                    onToggle={handleAccessToggle}
                    isToggling={togglingId === req.id}
                  />
                ))}
              </div>
            </div>
          )}

          {inactiveAccessRequests.length > 0 && (
            <div className="px-4 pt-6">
              <h3 className="text-[17px] font-semibold text-slate-900 mb-3">Inactive Requests</h3>
              <p className="text-[13px] text-slate-500 mb-3">Toggle on to restore access.</p>
              <div className="flex flex-col gap-3">
                {inactiveAccessRequests.map((req) => (
                  <ActiveAccessCard
                    key={req.id}
                    request={req}
                    onToggle={handleAccessToggle}
                    isToggling={togglingId === req.id}
                  />
                ))}
              </div>
            </div>
          )}

          {pendingRequests.length > 0 && (
            <div className="px-4 pt-6 pb-4">
              <h3 className="text-[17px] font-semibold text-slate-900 mb-3">Pending Requests</h3>
              <div className="flex flex-col gap-3">
                {pendingRequests.map((req) => (
                  <InventoryUpdateRequestCard
                    key={req.id}
                    request={req}
                    onApprove={() => handleApprove(req.id)}
                    onReject={() => handleRejectPress(req)}
                    isApproving={approvingId === req.id}
                    isRejecting={rejectingId === req.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {requestToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-[10px] p-4 max-w-md w-full">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-2">Reject Request</h3>
            <p className="text-[15px] text-slate-500 mb-3">
              Enter a reason for rejection (required):
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-slate-200 rounded-lg h-24 px-4 py-3 bg-white text-[15px] text-slate-900 mb-4 resize-none"
              placeholder="e.g. Please verify stock count first"
              disabled={!!rejectingId}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRejectCancel}
                disabled={!!rejectingId}
                className="flex-1 border-2 border-blue-800 rounded-[10px] h-[50px] font-semibold text-blue-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={!!rejectingId}
                className="flex-1 bg-red-600 rounded-[10px] h-[50px] flex items-center justify-center gap-2 font-semibold text-white"
              >
                {rejectingId ? (
                  <LoadingSpinner />
                ) : (
                  <Icon name="x-mark" className="w-5 h-5" />
                )}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
