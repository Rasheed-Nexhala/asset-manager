import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { returnItems } from '../../store/thunks/requestThunks';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import {
  selectUserId,
  selectUserDisplayName,
  selectCanManageRequests,
} from '../../store/selectors/authSelectors';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import { requestService } from '../../services/firebase/requestService';
import { FormField } from '../../components/auth/FormField';
import { WeightDisplay } from '../../components/inventory/WeightDisplay';
import { ViewModeToggle } from '../../components/inventory/ViewModeToggle';
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import { isWeightBasedItem } from '../../utils/weightConversionUtils';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { QuickMoveToMaintenanceButton } from '../../components/maintenance/QuickMoveToMaintenanceButton';
import { useToast } from '../../contexts/ToastContext';
import type {
  Request,
  RequestItem,
  ItemCondition,
  ReturnItemsData,
} from '../../types/request';

const CONDITIONS: Array<{ value: ItemCondition; label: string }> = [
  { value: 'good', label: 'Good' },
  { value: 'needs_maintenance', label: 'Needs Maintenance' },
  { value: 'damaged', label: 'Damaged' },
];

interface ReturnItemState {
  itemId: string;
  itemName: string;
  remainingQuantity: number;
  quantityReturned: number;
  condition: ItemCondition;
  selected: boolean;
}

function formatDate(
  ts: { toDate?: () => Date } | null | undefined
): string {
  if (!ts) return '';
  const date =
    typeof (ts as { toDate?: () => Date }).toDate === 'function'
      ? (ts as { toDate: () => Date }).toDate()
      : new Date();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ReturnItemsPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const canManageRequests = useAppSelector(selectCanManageRequests);
  const inventoryItems = useAppSelector(selectAllItems);
  const { viewMode, toggleViewMode } = useWeightViewPreference();

  const [request, setRequest] = useState<Request | null>(null);
  const [returnItemsState, setReturnItemsState] = useState<ReturnItemState[]>(
    []
  );
  const [returnNotes, setReturnNotes] = useState('');
  const [errors, setErrors] = useState<{ items?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const nonConsumableItems = useCallback((req: Request) => {
    return (req?.items ?? []).filter((i) => i.itemType === 'non_consumable');
  }, []);

  useEffect(() => {
    if (inventoryItems.length === 0) {
      dispatch(fetchItems(undefined));
    }
  }, [dispatch, inventoryItems.length]);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    requestService
      .getRequestById(requestId)
      .then((r) => {
        if (!cancelled && r && (r.status === 'transferred' || r.status === 'partially_returned')) {
          setRequest(r);
          const items = nonConsumableItems(r);
          const withRemaining = items
            .map((item) => {
              const currentReturned = item.quantityReturned ?? 0;
              const remaining = item.quantityApproved - currentReturned;
              return { ...item, remaining };
            })
            .filter((item) => item.remaining > 0);
          setReturnItemsState(
            withRemaining.map((item) => ({
              itemId: item.itemId,
              itemName: item.itemName,
              remainingQuantity: item.remaining,
              quantityReturned: 1,
              condition: 'good' as ItemCondition,
              selected: false,
            }))
          );
        } else if (!cancelled) {
          toast.error(
            'Only transferred or partially returned requests have items that can be returned'
          );
          navigate(-1);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load request');
          navigate(-1);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, navigate, nonConsumableItems, toast]);

  const updateItem = useCallback(
    (itemId: string, updates: Partial<ReturnItemState>) => {
      setReturnItemsState((prev) =>
        prev.map((item) =>
          item.itemId === itemId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  const validateForm = (): boolean => {
    const hasSelection = returnItemsState.some((i) => i.selected);
    if (!hasSelection) {
      setErrors({ items: 'At least one item must be selected' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !userId || !userName || !requestId) return;
    const selectedItems = returnItemsState.filter((i) => i.selected);
    if (selectedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const returnData: ReturnItemsData = {
        items: selectedItems.map((item) => ({
          itemId: item.itemId,
          quantityReturned: item.quantityReturned,
          condition: item.condition,
        })),
        returnNotes: returnNotes.trim() || undefined,
      };

      await dispatch(
        returnItems({
          requestId,
          returnData,
          userId,
          userName,
        })
      ).unwrap();

      toast.success('Items returned successfully');
      navigate(-1);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to return items'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
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
            Return Items
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <span className="sr-only">Loading request</span>
        </div>
      </div>
    );
  }

  if (!request) return null;

  const items = nonConsumableItems(request);
  const hasItemsToReturn = returnItemsState.length > 0;

  if (items.length === 0) {
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
            Return Items
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="cube" className="h-20 w-20 text-slate-400" />
          <h2 className="text-[22px] font-semibold text-slate-900 text-center mb-2 mt-4">
            No Returnable Items
          </h2>
          <p className="text-[15px] text-slate-500 text-center">
            This request only contains consumable items. Non-consumable items
            can be returned to the central store.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 px-6 py-3 bg-blue-800 rounded-[10px] text-[15px] font-semibold text-white hover:bg-blue-900"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (items.length > 0 && !hasItemsToReturn) {
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
            Return Items
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="check-circle" className="h-20 w-20 text-green-600" />
          <h2 className="text-[22px] font-semibold text-slate-900 text-center mb-2 mt-4">
            All Items Returned
          </h2>
          <p className="text-[15px] text-slate-500 text-center">
            All non-consumable items in this request have been returned to the
            central store.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 px-6 py-3 bg-blue-800 rounded-[10px] text-[15px] font-semibold text-white hover:bg-blue-900"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

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
          Return Items
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-[13px] text-slate-500 mb-1">
            All returns go to Central Store first
          </p>
          <p className="text-[15px] text-slate-900">
            Store Incharge may later move damaged items to Maintenance.
          </p>
        </div>

        {/* Previous Return History */}
        {request.returnHistory && request.returnHistory.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <h2 className="text-[15px] font-semibold text-slate-900">Previous Returns</h2>
            {request.returnHistory.map((returnEvent) => (
              <div
                key={returnEvent.returnId}
                className="mb-3 pb-3 border-b border-slate-200 last:border-b-0 last:mb-0 last:pb-0 space-y-2"
              >
                <p className="text-[13px] text-slate-500">
                  {formatDate(returnEvent.returnedAt)} by {returnEvent.returnedByName} —{' '}
                  {returnEvent.items.length} item(s)
                </p>
                {returnEvent.items.map((returnedItem) => {
                  const isDamaged = returnedItem.condition === 'damaged';
                  const hasNotes =
                    returnEvent.returnNotes && returnEvent.returnNotes.trim();
                  const reqItem = request.items?.find(
                    (i) => i.itemId === returnedItem.itemId
                  );
                  return (
                    <div key={returnedItem.itemId} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[15px] text-slate-900">
                          {returnedItem.itemName}
                        </span>
                        <span className="text-[15px] text-slate-900">
                          {returnedItem.quantityReturned}{' '}
                          {reqItem?.unit ?? 'units'} returned
                        </span>
                      </div>
                      {isDamaged && (
                        <div className="flex items-center gap-1">
                          <Icon name="exclamation-triangle" className="h-4 w-4 text-amber-600" />
                          <span className="text-[13px] text-amber-600">
                            Damaged{hasNotes && ` • ${returnEvent.returnNotes}`}
                          </span>
                        </div>
                      )}
                      {isDamaged && canManageRequests && (
                        <div className="mt-2">
                          <QuickMoveToMaintenanceButton
                            itemId={returnedItem.itemId}
                            itemName={returnedItem.itemName}
                            itemSku={reqItem?.itemSku || ''}
                            quantity={returnedItem.quantityReturned}
                            issueDescription={`Returned damaged from ${request.siteName}. ${returnEvent.returnNotes || ''}`}
                            sourceRequestId={request.id}
                            sourceReturnDate={
                              typeof (returnEvent.returnedAt as { toDate?: () => Date }).toDate === 'function'
                                ? (returnEvent.returnedAt as { toDate: () => Date }).toDate()
                                : new Date()
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-semibold text-slate-900">
              Select Items to Return
            </h2>
            {returnItemsState.some((i) => {
              const ri = request.items?.find((r) => r.itemId === i.itemId);
              return ri ? isWeightBasedItem({ weightPerMeter: ri.weightPerMeter }) : false;
            }) && (
              <ViewModeToggle
                viewMode={viewMode}
                onToggle={toggleViewMode}
                compact
              />
            )}
          </div>
          <div className="space-y-3">
            {returnItemsState.map((item) => {
              const requestItem = request.items?.find(
                (i) => i.itemId === item.itemId
              ) as RequestItem | undefined;
              const isSteelItem = requestItem
                ? isWeightBasedItem({
                    weightPerMeter: requestItem.weightPerMeter,
                  })
                : false;
              const displayUnit =
                requestItem?.unit ??
                inventoryItems.find((i) => i.id === item.itemId)?.unit ??
                'units';
              return (
                <div
                  key={item.itemId}
                  className="bg-white rounded-[10px] p-4 border border-slate-200"
                >
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(item.itemId, {
                        selected: !item.selected,
                      })
                    }
                    className="w-full flex items-center mb-3 text-left"
                  >
                    <span
                      className={`w-6 h-6 rounded border-2 mr-3 flex items-center justify-center ${
                        item.selected
                          ? 'border-blue-800 bg-blue-800'
                          : 'border-slate-200'
                      }`}
                    >
                      {item.selected && (
                        <Icon name="check" className="h-4 w-4 text-white" />
                      )}
                    </span>
                    <span className="text-[15px] font-semibold text-slate-900 flex-1">
                      {item.itemName}
                    </span>
                    <span className="text-[13px] text-slate-500 flex items-center gap-1">
                      Max:{' '}
                      {isSteelItem &&
                      requestItem?.weightPerMeter != null &&
                      requestItem?.lengthPerPiece != null ? (
                        <WeightDisplay
                          quantity={item.remainingQuantity}
                          weightPerMeter={requestItem.weightPerMeter}
                          lengthPerPiece={requestItem.lengthPerPiece}
                          viewMode={viewMode}
                          unit={requestItem.unit || 'Pcs'}
                        />
                      ) : (
                        `${item.remainingQuantity} ${displayUnit}`
                      )}
                    </span>
                  </button>

                  {item.selected && (
                    <div className="gap-3 mt-2 pt-3 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-slate-500">
                          Quantity to return
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.itemId, {
                                quantityReturned: Math.max(
                                  1,
                                  item.quantityReturned - 1
                                ),
                              })
                            }
                            className="w-8 h-8 border border-slate-200 rounded-full flex items-center justify-center text-blue-800"
                          >
                            <Icon name="minus" className="h-4 w-4" />
                          </button>
                          <span className="text-[15px] font-semibold w-8 text-center">
                            {item.quantityReturned}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.itemId, {
                                quantityReturned: Math.min(
                                  item.remainingQuantity,
                                  item.quantityReturned + 1
                                ),
                              })
                            }
                            className="w-8 h-8 border border-blue-800 rounded-full flex items-center justify-center bg-blue-800 text-white"
                          >
                            <Icon name="plus" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-[13px] text-slate-500 mb-2">
                          Condition
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {CONDITIONS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() =>
                                updateItem(item.itemId, {
                                  condition: c.value,
                                })
                              }
                              className={`px-3 py-2 rounded-lg border text-[13px] font-medium ${
                                item.condition === c.value
                                  ? 'border-blue-800 bg-blue-800/10 text-blue-800'
                                  : 'border-slate-200 bg-white text-slate-500'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {errors.items && (
            <p className="text-[13px] text-red-600 mt-1">{errors.items}</p>
          )}
        </div>

        <FormField
          label="Return Notes (optional)"
          value={returnNotes}
          onChange={setReturnNotes}
          placeholder="Any notes about the return..."
          multiline
          rows={3}
        />
      </div>

      <div className="bg-white border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-blue-800 rounded-[10px] h-[50px] flex items-center justify-center text-[15px] font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
          ) : (
            'Submit Return'
          )}
        </button>
      </div>
    </div>
  );
}
