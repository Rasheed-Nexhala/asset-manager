import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { rejectRequest } from '../../store/thunks/requestThunks';
import { requestService } from '../../services/firebase/requestService';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
import { FormField } from '../../components/auth/FormField';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import type { RejectRequestData } from '../../types/request';

const REJECTION_REASONS: Array<{
  value: RejectRequestData['reason'];
  label: string;
}> = [
  { value: 'insufficient_stock', label: 'Insufficient Stock' },
  { value: 'duplicate_request', label: 'Duplicate Request' },
  { value: 'items_not_required', label: 'Items Not Required' },
  { value: 'other', label: 'Other' },
];

export function RejectRequestPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);

  const [request, setRequest] = useState<{ requestNumber: string } | null>(
    null
  );
  const [reason, setReason] = useState<RejectRequestData['reason'] | ''>('');
  const [comments, setComments] = useState('');
  const [errors, setErrors] = useState<{ reason?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    requestService
      .getRequestById(requestId)
      .then((r) => {
        if (!cancelled && r) setRequest(r);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const validateForm = (): boolean => {
    const newErrors: { reason?: string } = {};
    if (!reason) newErrors.reason = 'Rejection reason is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReject = async () => {
    if (!validateForm() || !userId || !userName || !requestId) return;
    setIsSubmitting(true);
    try {
      await dispatch(
        rejectRequest({
          requestId,
          rejectionData: {
            reason: reason as RejectRequestData['reason'],
            comments: comments.trim() || undefined,
          },
          processedBy: userId,
          processedByName: userName,
        })
      ).unwrap();
      window.alert('Request rejected');
      navigate(-1);
    } catch (error: unknown) {
      window.alert(
        error instanceof Error ? error.message : 'Failed to reject request'
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
            Reject Request
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <span className="sr-only">Loading request</span>
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
          Reject Request
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {request && (
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-[13px] text-slate-500 mb-1">Rejecting request</p>
            <p className="text-[17px] font-semibold text-slate-900">
              {request.requestNumber}
            </p>
          </div>
        )}

        <div>
          <label className="block text-[15px] font-medium text-slate-900 mb-2">
            Rejection Reason <span className="text-red-600">*</span>
          </label>
          <div className="space-y-2">
            {REJECTION_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  setReason(r.value);
                  setErrors((p) => ({ ...p, reason: undefined }));
                }}
                className={`w-full flex items-center p-4 rounded-lg border text-left ${
                  reason === r.value
                    ? 'border-blue-800 bg-blue-800/5'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                aria-pressed={reason === r.value}
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    reason === r.value
                      ? 'border-blue-800 bg-blue-800'
                      : 'border-slate-200'
                  }`}
                >
                  {reason === r.value && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
                <span className="text-[15px] text-slate-900">{r.label}</span>
              </button>
            ))}
          </div>
          {errors.reason && (
            <p className="text-[13px] text-red-600 mt-1">{errors.reason}</p>
          )}
        </div>

        <FormField
          label="Comments (Optional)"
          value={comments}
          onChange={setComments}
          placeholder="Provide details for the rejection..."
          multiline
          rows={4}
        />
      </div>

      <div className="bg-white border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleReject}
          disabled={isSubmitting}
          className="w-full bg-red-600 rounded-[10px] h-[50px] flex items-center justify-center text-[15px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
          ) : (
            'Confirm Rejection'
          )}
        </button>
      </div>
    </div>
  );
}
