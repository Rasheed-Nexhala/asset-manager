/**
 * Request Inventory Access Modal
 *
 * Store Incharge requests Admin approval to update central store inventory.
 * Fields: reason (required), notes (optional).
 * Uses CIAMS design system styling.
 */

import { useState, useCallback } from 'react';
import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';

const DEFAULT_REASON_OPTIONS = [
  { value: 'Physical count variation', label: 'Physical count variation' },
  { value: 'Stock discrepancy', label: 'Stock discrepancy' },
  { value: 'Other', label: 'Other' },
];

export interface RequestInventoryAccessSubmitData {
  reason: string;
  notes?: string;
}

export interface RequestInventoryAccessModalProps {
  visible: boolean;
  onSubmit: (data: RequestInventoryAccessSubmitData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  description?: string;
  reasonOptions?: { value: string; label: string }[];
}

export function RequestInventoryAccessModal({
  visible,
  onSubmit,
  onCancel,
  loading = false,
  title = 'Request Inventory Access',
  description = 'You need Admin approval to update central store inventory. Submit a request with a reason.',
  reasonOptions = DEFAULT_REASON_OPTIONS,
}: RequestInventoryAccessModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setReason('');
    setNotes('');
    setErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!reason.trim()) newErrors.reason = 'Reason is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [reason]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    try {
      await onSubmit({ reason: reason.trim(), notes: notes.trim() || undefined });
      resetForm();
      onCancel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit request';
      setErrors((e) => ({ ...e, submit: msg }));
    }
  }, [reason, notes, validate, onSubmit, onCancel, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onCancel();
  }, [resetForm, onCancel]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-access-title"
    >
      <div className="bg-white rounded-t-2xl sm:rounded-[10px] w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Handle Bar - mobile */}
        <div className="w-10 h-1 bg-slate-200 rounded-full self-center mt-3 sm:hidden" />

        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2
            id="request-access-title"
            className="text-[22px] font-semibold text-slate-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-70"
            aria-label="Close"
          >
            <Icon name="x-mark" className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="flex flex-col gap-4">
            <p className="text-[15px] text-slate-500">{description}</p>

            <div>
              <label className="block text-[15px] text-slate-900 mb-1.5">
                Reason <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {reasonOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setReason(opt.value);
                      setErrors((e) => ({ ...e, reason: '' }));
                    }}
                    disabled={loading}
                    className={`px-4 py-2.5 rounded-full border min-h-[48px] flex items-center justify-center transition-colors ${
                      reason === opt.value
                        ? 'bg-blue-800 border-blue-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
                    }`}
                    role="radio"
                    aria-checked={reason === opt.value}
                    aria-label={`Reason: ${opt.label}`}
                  >
                    <span className="text-[13px] font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
              {errors.reason && (
                <p className="text-[13px] text-red-600 mt-1" role="alert">
                  {errors.reason}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[15px] text-slate-900 mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional context for your request..."
                disabled={loading}
                className="w-full border border-slate-200 rounded-lg min-h-[80px] px-4 py-3 bg-white text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800"
                aria-label="Notes input"
              />
            </div>

            {errors.submit && (
              <div className="bg-red-600/15 rounded-[10px] p-3 flex items-center gap-2">
                <Icon name="exclamation-circle" className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-[13px] text-red-600 flex-1">{errors.submit}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`rounded-[10px] h-[50px] flex items-center justify-center gap-2 w-full transition-colors ${
                loading ? 'bg-blue-800/70' : 'bg-blue-800 hover:bg-blue-900'
              } text-white font-semibold disabled:cursor-not-allowed`}
              aria-label={loading ? 'Submitting, please wait' : 'Submit Request'}
              aria-busy={loading}
            >
              {loading ? (
                <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
              ) : (
                <>
                  <Icon name="arrow-right" className="w-5 h-5" />
                  <span className="text-[15px]">Submit Request</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="border-[1.5px] border-blue-800 rounded-[10px] h-[50px] flex items-center justify-center w-full text-blue-800 font-semibold hover:bg-blue-50 transition-colors disabled:opacity-70"
              aria-label="Cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
