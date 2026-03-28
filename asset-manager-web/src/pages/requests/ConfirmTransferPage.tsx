import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { transferRequest } from '../../store/thunks/requestThunks';
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
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import { isWeightBasedItem } from '../../utils/weightConversionUtils';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import type { Request } from '../../types/request';
import {
  printTransferSlip,
  canPrintTransferSlip,
} from '../../utils/transferSlipPdfUtils';

export function ConfirmTransferPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const canManageRequests = useAppSelector(selectCanManageRequests);
  const inventoryItems = useAppSelector(selectAllItems);
  const { viewMode } = useWeightViewPreference();

  const [request, setRequest] = useState<Request | null>(null);
  const [receivedByName, setReceivedByName] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [errors, setErrors] = useState<{ receivedByName?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (inventoryItems.length === 0) {
      dispatch(fetchItems(undefined));
    }
  }, [dispatch, inventoryItems.length]);

  useEffect(() => {
    if (!requestId) return;
    if (!canManageRequests) {
      toast.error(
        'Only Super Admin and Store Incharge can confirm transfers.'
      );
      navigate(-1);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    requestService
      .getRequestById(requestId)
      .then((r) => {
        if (cancelled) return;
        if (r && r.status === 'approved') {
          setRequest(r);
        } else {
          toast.error('Only approved requests can be transferred');
          navigate(-1);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load request details');
          navigate(-1);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, navigate, canManageRequests, toast]);

  const validateForm = (): boolean => {
    const newErrors: { receivedByName?: string } = {};
    if (!receivedByName.trim()) {
      newErrors.receivedByName = 'Received by is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm() || !request || !userId || !userName || !requestId)
      return;
    setIsSubmitting(true);
    try {
      const updated = await dispatch(
        transferRequest({
          requestId,
          transferData: {
            receivedBy: '',
            receivedByName: receivedByName.trim(),
          },
          transferredBy: userId,
          transferredByName: userName,
        })
      ).unwrap();
      toast.success('Transfer confirmed successfully');
      if (updated && canPrintTransferSlip(updated)) {
        try {
          await printTransferSlip(updated);
        } catch (printErr) {
          toast.error(
            printErr instanceof Error
              ? printErr.message
              : 'Transfer saved. Print the slip from the request when ready.'
          );
        }
      }
      navigate('/requests/queue');
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to confirm transfer'
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
            Confirm Transfer
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[15px] text-slate-500">
            Loading transfer details...
          </p>
        </div>
      </div>
    );
  }

  if (!request) return null;

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
          Confirm Transfer
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        <div className="bg-slate-50 rounded-lg p-4">
          {request.requestType === 'site_transfer' ? (
            <>
              <p className="text-[13px] text-slate-500 mb-1">Site Transfer</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-semibold text-slate-900">
                  {request.sourceSiteName ?? '—'}
                </span>
                <Icon name="arrow-right" className="h-4 w-4 text-indigo-500" />
                <span className="text-[15px] font-semibold text-slate-900">
                  {request.siteName}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] text-slate-500 mb-1">Transfer to</p>
              <p className="text-[17px] font-semibold text-slate-900">
                {request.siteName}
              </p>
            </>
          )}
        </div>

        <div>
          <h2 className="text-[17px] font-semibold text-slate-900 mb-2">
            Items to Transfer
          </h2>
          <div className="space-y-3">
            {(request.items ?? []).map((item) => {
              const isSteelItem = isWeightBasedItem({
                weightPerMeter: item.weightPerMeter,
              });
              const displayUnit =
                item.unit ??
                inventoryItems.find((i) => i.id === item.itemId)?.unit ??
                'units';
              return (
                <div
                  key={item.itemId}
                  className="flex items-center p-4 bg-white rounded-[10px] border border-slate-200"
                >
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-slate-900">
                      {item.itemName}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] text-slate-500">Qty: </span>
                      {isSteelItem &&
                      item.weightPerMeter != null &&
                      item.lengthPerPiece != null ? (
                        <WeightDisplay
                          quantity={item.quantityApproved}
                          weightPerMeter={item.weightPerMeter}
                          lengthPerPiece={item.lengthPerPiece}
                          viewMode={viewMode}
                          unit={item.unit || 'Pcs'}
                        />
                      ) : (
                        <span className="text-[13px] text-slate-500">
                          {item.quantityApproved} {displayUnit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <FormField
          label="Received By"
          required
          value={receivedByName}
          onChange={(v) => {
            setReceivedByName(v);
            setErrors((p) => ({ ...p, receivedByName: undefined }));
          }}
          placeholder="Name of person receiving items at site"
          error={errors.receivedByName}
        />

        <FormField
          label="Transfer Notes (optional)"
          value={transferNotes}
          onChange={setTransferNotes}
          placeholder="Any additional notes..."
          multiline
          rows={3}
        />

        <div className="bg-amber-500/15 rounded-lg p-4 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="exclamation-triangle" className="h-6 w-6 text-amber-600" />
            <span className="text-[15px] font-semibold text-amber-600">
              Important
            </span>
          </div>
          <p className="text-[13px] text-slate-500">
            This action cannot be undone. Confirm that items have been
            physically transferred to the site.
          </p>
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full bg-blue-800 rounded-[10px] h-[50px] flex items-center justify-center text-[15px] font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
          ) : (
            'Confirm Transfer'
          )}
        </button>
      </div>
    </div>
  );
}
