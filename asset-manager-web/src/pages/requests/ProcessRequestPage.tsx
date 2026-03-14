import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { approveRequest } from '../../store/thunks/requestThunks';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsStoreIncharge,
  selectIsAdmin,
} from '../../store/selectors/authSelectors';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import { selectRequestById } from '../../store/selectors/requestSelectors';
import { requestService } from '../../services/firebase/requestService';
import { RequestItemCard } from '../../components/requests/RequestItemCard';
import { RequestStatusBadge } from '../../components/requests/RequestStatusBadge';
import { RequestTypeBadge } from '../../components/requests/RequestTypeBadge';
import { ViewModeToggle } from '../../components/inventory/ViewModeToggle';
import { FormField } from '../../components/auth/FormField';
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import { isWeightBasedItem } from '../../utils/weightConversionUtils';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import type {
  Request,
  ItemAvailability,
  ItemCondition,
} from '../../types/request';

const CONDITION_LABELS: Record<ItemCondition, string> = {
  good: 'Good',
  needs_maintenance: 'Needs maintenance',
  damaged: 'Damaged',
};

const priorityConfig = {
  high: { icon: 'exclamation-circle' as const, color: 'text-red-600' },
  medium: { icon: 'minus-circle' as const, color: 'text-amber-600' },
  low: { icon: 'check-circle' as const, color: 'text-green-600' },
};

function formatDate(
  timestamp: { toDate?: () => Date } | null | undefined
): string {
  if (!timestamp) return '';
  const date =
    typeof (timestamp as { toDate?: () => Date }).toDate === 'function'
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ProcessRequestPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isAdmin = useAppSelector(selectIsAdmin);
  const inventoryItems = useAppSelector(selectAllItems);
  const requestFromStore = useAppSelector(
    selectRequestById(requestId ?? '')
  );

  const { viewMode, toggleViewMode } = useWeightViewPreference();
  const [request, setRequest] = useState<Request | null>(
    requestFromStore ?? null
  );
  const [approvedQuantities, setApprovedQuantities] = useState<
    Record<string, number>
  >({});
  const [availability, setAvailability] = useState<ItemAvailability[]>([]);
  const [storeNotes, setStoreNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null
  );
  const [retryKey, setRetryKey] = useState(0);

  const canProcess = isStoreIncharge || isAdmin;
  const allSufficient =
    availability.length > 0 &&
    availability.every((a) => {
      const requested = approvedQuantities[a.itemId] ?? a.requested;
      return a.available >= requested;
    });
  const isPending = request?.status === 'pending';

  useEffect(() => {
    if (inventoryItems.length === 0) {
      dispatch(fetchItems(undefined));
    }
  }, [dispatch, inventoryItems.length]);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    setSubscriptionError(null);
    const unsubscribe = requestService.subscribeToRequest(
      requestId,
      (updated) => {
        if (!cancelled && updated) {
          setRequest(updated);
          setSubscriptionError(null);
        } else if (!cancelled) {
          setRequest(null);
        }
      },
      (err) => {
        if (!cancelled) {
          setSubscriptionError(err?.message ?? 'Failed to load request.');
        }
      }
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [requestId, retryKey]);

  useEffect(() => {
    if (requestFromStore && requestFromStore.id === requestId) {
      const currentMs =
        (request?.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      const reduxMs =
        (requestFromStore.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      if (reduxMs >= currentMs) setRequest(requestFromStore);
    }
  }, [requestFromStore, requestId, request]);

  useEffect(() => {
    if (request && request.status === 'pending') {
      setApprovedQuantities((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial: Record<string, number> = {};
        (request.items ?? []).forEach((item) => {
          initial[item.itemId] = item.quantityRequested;
        });
        return initial;
      });
    }
  }, [request]);

  const handleQuantityChange = useCallback(
    (itemId: string, qty: number) => {
      const item = request?.items?.find((i) => i.itemId === itemId);
      const maxQty = item?.quantityRequested ?? Infinity;
      const clamped = Math.max(1, Math.min(qty, maxQty));
      setApprovedQuantities((p) => ({ ...p, [itemId]: clamped }));
    },
    [request]
  );

  useEffect(() => {
    if (!request || !isPending || !canProcess) {
      setIsCheckingAvailability(false);
      return;
    }
    const check = async () => {
      setIsCheckingAvailability(true);
      try {
        const itemsToCheck = (request.items ?? []).map((item) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantityRequested: item.quantityRequested,
        }));
        const sourceLocationId =
          request.requestType === 'site_transfer' && request.sourceSiteId
            ? `site_${request.sourceSiteId}`
            : 'store';
        const result = await requestService.checkItemsAvailability(
          itemsToCheck,
          sourceLocationId
        );
        setAvailability(result);
      } catch {
        setAvailability([]);
      } finally {
        setIsCheckingAvailability(false);
      }
    };
    check();
  }, [request, isPending, canProcess]);

  const getAvailabilityForItem = useCallback(
    (itemId: string) => {
      const a = availability.find((av) => av.itemId === itemId);
      if (!a) return undefined;
      const requested = approvedQuantities[itemId] ?? a.requested;
      return {
        available: a.available,
        sufficient: a.available >= requested,
      };
    },
    [availability, approvedQuantities]
  );

  const handleApprove = useCallback(async () => {
    if (!request || !userId || !userName || !allSufficient) return;
    setIsLoading(true);
    try {
      await dispatch(
        approveRequest({
          requestId: request.id,
          processedBy: userId,
          processedByName: userName,
          storeNotes: storeNotes.trim() || undefined,
          updatedItems: Object.entries(approvedQuantities).map(
            ([itemId, quantityApproved]) => ({ itemId, quantityApproved })
          ),
        })
      ).unwrap();
    } catch (error: unknown) {
      window.alert(
        error instanceof Error ? error.message : 'Failed to approve request'
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    request,
    userId,
    userName,
    storeNotes,
    allSufficient,
    approvedQuantities,
    dispatch,
  ]);

  const isTransferred = request?.status === 'transferred';
  const isPartiallyReturned = request?.status === 'partially_returned';
  const isApproved = request?.status === 'approved';
  const showConfirmTransfer = isApproved && canProcess;
  const isRequestOwner = request?.requestedBy === userId;
  const nonConsumables =
    request?.items?.filter((i) => i.itemType === 'non_consumable') ?? [];
  const hasItemsToReturn = nonConsumables.some(
    (i) => (i.quantityReturned ?? 0) < i.quantityApproved
  );
  const showReturnItems =
    (isTransferred || isPartiallyReturned) &&
    isRequestOwner &&
    !canProcess &&
    hasItemsToReturn;

  if (!request) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center gap-4 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-6 w-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">
            Process Request
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          {subscriptionError ? (
            <>
              <Icon
                name="exclamation-circle"
                className="h-16 w-16 text-red-600"
              />
              <h2 className="text-[17px] font-semibold text-slate-900 mt-4 text-center">
                Unable to Load Request
              </h2>
              <p className="text-[15px] text-slate-500 mt-2 text-center">
                {subscriptionError}
              </p>
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="mt-6 bg-blue-800 rounded-[10px] h-[50px] px-8 text-white font-semibold hover:bg-blue-900"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <LoadingSpinner className="h-8 w-8 text-blue-800" />
              <p className="text-[15px] text-slate-500 mt-4">
                Loading request...
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const priorityInfo =
    priorityConfig[request.priority as keyof typeof priorityConfig] ??
    priorityConfig.medium;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-100"
          aria-label="Go back"
        >
          <Icon name="arrow-left" className="h-6 w-6" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900">
          Process Request
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        <div className="bg-white rounded-[10px] p-4 border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 flex-1">
              <Icon
                name={priorityInfo.icon}
                className={`h-5 w-5 ${priorityInfo.color}`}
              />
              <span className="text-[17px] font-semibold text-slate-900">
                {request.requestNumber}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <RequestTypeBadge requestType={request.requestType} />
              <RequestStatusBadge status={request.status} />
            </div>
          </div>

          <div className="space-y-2">
            {request.requestType === 'site_transfer' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-[13px] text-slate-500">From Site</span>
                  <span className="text-[15px] text-slate-900">
                    {request.sourceSiteName ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-slate-500">To Site</span>
                  <span className="text-[15px] text-slate-900">
                    {request.siteName}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-[13px] text-slate-500">Site</span>
                <span className="text-[15px] text-slate-900">
                  {request.siteName}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[13px] text-slate-500">Requested by</span>
              <span className="text-[15px] text-slate-900">
                {request.requestedByName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-slate-500">Created</span>
              <span className="text-[15px] text-slate-900">
                {formatDate(request.createdAt)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-[13px] text-slate-500 mb-1">Purpose</p>
            <p className="text-[15px] text-slate-900">{request.purpose}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[17px] font-semibold text-slate-900">Items</h2>
            {(request.items ?? []).some((i) =>
              isWeightBasedItem({ weightPerMeter: i.weightPerMeter })
            ) && (
              <ViewModeToggle
                viewMode={viewMode}
                onToggle={toggleViewMode}
                compact
              />
            )}
          </div>
          <div className="space-y-3">
            {(request.items ?? []).map((item) => (
              <RequestItemCard
                key={item.itemId}
                item={{
                  ...item,
                  quantityRequested:
                    approvedQuantities[item.itemId] ?? item.quantityRequested,
                  unit:
                    item.unit ??
                    inventoryItems.find((i) => i.id === item.itemId)?.unit,
                }}
                mode={canProcess && isPending ? 'edit' : 'view'}
                onQuantityChange={handleQuantityChange}
                availability={
                  canProcess && isPending
                    ? getAvailabilityForItem(item.itemId)
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {canProcess && isPending && (
          <FormField
            label="Store Notes (optional)"
            value={storeNotes}
            onChange={setStoreNotes}
            placeholder="Add any notes for this approval..."
            multiline
            rows={3}
          />
        )}
      </div>

      {canProcess && isPending && (
        <div className="bg-white border-t border-slate-200 pt-4 flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/requests/${requestId}/reject`)}
            disabled={isLoading}
            className="flex-1 border-[1.5px] border-red-600 rounded-[10px] h-[50px] flex items-center justify-center text-[15px] font-semibold text-red-600 hover:bg-red-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={
              isLoading || !allSufficient || isCheckingAvailability
            }
            className={`flex-1 bg-blue-800 rounded-[10px] h-[50px] flex items-center justify-center text-[15px] font-semibold text-white hover:bg-blue-900 ${
              !allSufficient || isCheckingAvailability ? 'opacity-50' : ''
            }`}
          >
            {isLoading ? (
              <LoadingSpinner className="h-5 w-5 text-white" />
            ) : (
              'Approve'
            )}
          </button>
        </div>
      )}

      {showConfirmTransfer && (
        <div className="bg-white border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() =>
              navigate(`/requests/${requestId}/confirm-transfer`)
            }
            className="w-full bg-green-600 rounded-[10px] h-[50px] flex items-center justify-center gap-2 text-[15px] font-semibold text-white hover:bg-green-700"
          >
            <Icon name="check" className="h-5 w-5" />
            Confirm Transfer
          </button>
          <p className="text-[13px] text-slate-500 mt-2 text-center">
            Items physically delivered? Confirm to update inventory.
          </p>
        </div>
      )}

      {showReturnItems && (
        <div className="bg-white border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/requests/${requestId}/return`)}
            className="w-full bg-blue-800 rounded-[10px] h-[50px] flex items-center justify-center gap-2 text-[15px] font-semibold text-white hover:bg-blue-900"
          >
            <Icon name="arrow-path" className="h-5 w-5" />
            Return Items
          </button>
        </div>
      )}
    </div>
  );
}
