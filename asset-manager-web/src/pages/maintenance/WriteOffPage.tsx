import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { WriteOffReasonSelector } from '../../components/maintenance';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMaintenanceById,
  writeOffItemThunk,
} from '../../store/thunks/maintenanceThunks';
import { selectMaintenanceById } from '../../store/selectors/maintenanceSelectors';
import { selectUserId, selectUserDisplayName, selectIsAdmin, selectIsStoreIncharge } from '../../store/selectors/authSelectors';
import type { WriteOffData, WriteOffReason } from '../../types/maintenance';

export function WriteOffPage() {
  const { maintenanceId } = useParams<{ maintenanceId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const maintenance = useAppSelector((state) =>
    maintenanceId ? selectMaintenanceById(maintenanceId)(state) : null
  );

  const canWriteOff = isAdmin || isStoreIncharge;

  const [writeOffQuantity, setWriteOffQuantity] = useState(1);
  const [reason, setReason] = useState<WriteOffReason | null>(null);
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const displayUnit = maintenance?.unit || 'Pcs';

  useEffect(() => {
    if (!maintenance && maintenanceId) {
      dispatch(fetchMaintenanceById(maintenanceId));
    }
  }, [dispatch, maintenanceId, maintenance]);

  useEffect(() => {
    if (maintenance) {
      setWriteOffQuantity(maintenance.quantity);
    }
  }, [maintenance]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!writeOffQuantity || writeOffQuantity <= 0) {
      newErrors.writeOffQuantity = 'Write-off quantity is required';
    } else if (maintenance && writeOffQuantity > maintenance.quantity) {
      newErrors.writeOffQuantity = `Cannot exceed ${maintenance.quantity}`;
    }
    if (!reason) {
      newErrors.reason = 'Write-off reason is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [writeOffQuantity, reason, maintenance]);

  const handleWriteOffClick = useCallback(() => {
    if (!validateForm()) return;
    setShowConfirm(true);
  }, [validateForm]);

  const submitWriteOff = useCallback(async () => {
    if (!maintenance || !userId || !userName || !reason || !maintenanceId) return;

    const writeOffData: WriteOffData = {
      writeOffQuantity,
      reason,
      explanation: explanation.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await dispatch(
        writeOffItemThunk({
          maintenanceId,
          writeOffData,
          userId,
          userName,
        })
      ).unwrap();
      navigate(`/maintenance/${maintenanceId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to write off items';
      setErrors((prev) => ({ ...prev, writeOffQuantity: msg }));
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  }, [
    maintenance,
    userId,
    userName,
    reason,
    writeOffQuantity,
    explanation,
    dispatch,
    maintenanceId,
    navigate,
  ]);

  if (!maintenance) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">Write Off Item</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-24">
          <LoadingSpinner className="h-10 w-10 text-blue-800" />
          <p className="mt-4 text-[15px] text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!canWriteOff) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">Write Off Item</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Icon name="lock-closed" className="h-12 w-12 text-amber-600" />
          <h2 className="mt-4 text-[17px] font-semibold text-slate-900">Access Denied</h2>
          <p className="mt-2 text-[15px] text-slate-500">
            Only Admin and Store Incharge can write off items. Please contact your administrator.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/maintenance/${maintenanceId}`)}
            className="mt-6 flex h-[50px] items-center justify-center rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white hover:bg-blue-900"
          >
            Back to Maintenance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
          aria-label="Go back"
        >
          <Icon name="arrow-left" className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900">Write Off Item</h1>
      </div>

      <div className="space-y-4">
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[15px] font-semibold text-slate-900">{maintenance.itemName}</p>
          <p className="text-[13px] text-slate-500">SKU: {maintenance.itemSku}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[13px] text-slate-500">Available Quantity</span>
            <span className="text-[15px] font-semibold text-slate-900">
              {maintenance.quantity} {displayUnit}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-red-600/30 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <Icon name="exclamation-circle" className="h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-[13px] text-red-800">
              This permanently reduces total inventory. Cannot be undone.
            </p>
          </div>
        </div>

        <div>
          <label className="text-[15px] text-slate-900">
            Write Off Quantity <span className="text-red-600">*</span>
          </label>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setWriteOffQuantity((q) => Math.max(1, q - 1))}
              disabled={writeOffQuantity <= 1}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white disabled:opacity-50"
            >
              <Icon name="minus" className="h-5 w-5 text-blue-800" />
            </button>
            <input
              type="number"
              min={1}
              max={maintenance.quantity}
              value={writeOffQuantity}
              onChange={(e) => {
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num)) {
                  setWriteOffQuantity(num);
                  if (num <= 0) {
                    setErrors((prev) => ({
                      ...prev,
                      writeOffQuantity: 'Write-off quantity must be greater than 0',
                    }));
                  } else if (num > maintenance.quantity) {
                    setErrors((prev) => ({
                      ...prev,
                      writeOffQuantity: `Cannot exceed ${maintenance.quantity}`,
                    }));
                  } else {
                    setErrors((prev) => ({ ...prev, writeOffQuantity: '' }));
                  }
                }
              }}
              className={`h-12 flex-1 rounded-lg border bg-white px-4 text-center text-xl font-bold text-slate-900 ${
                errors.writeOffQuantity ? 'border-red-600' : 'border-slate-200'
              }`}
            />
            <button
              type="button"
              onClick={() =>
                setWriteOffQuantity((q) => Math.min(maintenance.quantity, q + 1))
              }
              disabled={writeOffQuantity >= maintenance.quantity}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-800 bg-blue-800 disabled:opacity-50"
            >
              <Icon name="plus" className="h-5 w-5 text-white" />
            </button>
          </div>
          {errors.writeOffQuantity && (
            <p className="mt-1 text-[13px] text-red-600">{errors.writeOffQuantity}</p>
          )}
        </div>

        <div>
          <label className="text-[15px] text-slate-900">
            Reason <span className="text-red-600">*</span>
          </label>
          <div className="mt-1.5">
            <WriteOffReasonSelector
              value={reason}
              onSelect={(r) => {
                setReason(r);
                if (errors.reason) setErrors((prev) => ({ ...prev, reason: '' }));
              }}
              error={errors.reason}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label className="text-[15px] text-slate-900">Explanation (Optional)</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Detailed explanation for write-off"
            rows={5}
            className="mt-1.5 min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
          />
          <p className="mt-1 text-[13px] text-slate-500">
            Provide details about why this item cannot be repaired or returned
          </p>
        </div>

        {!showConfirm ? (
          <button
            type="button"
            onClick={handleWriteOffClick}
            disabled={isSubmitting}
            className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-red-600 text-[15px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Icon name="x-circle" className="h-5 w-5" />
            Write Off Item
          </button>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-[15px] font-medium text-slate-900">
              Are you sure you want to write off {writeOffQuantity} {displayUnit}?
            </p>
            <p className="mt-2 text-[13px] text-slate-500">
              This action is PERMANENT and cannot be undone. The items will be permanently removed
              from total inventory.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-[10px] border border-slate-200 bg-white py-3 text-[15px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitWriteOff}
                disabled={isSubmitting}
                className="flex-1 rounded-[10px] bg-red-600 py-3 text-[15px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <LoadingSpinner className="mx-auto h-6 w-6 text-white" />
                ) : (
                  'Confirm Write Off'
                )}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-[13px] text-slate-500">
          This action is permanent and will reduce total inventory count
        </p>
      </div>
    </div>
  );
}
