import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMaintenanceById,
  returnFromMaintenanceThunk,
} from '../../store/thunks/maintenanceThunks';
import { selectMaintenanceById } from '../../store/selectors/maintenanceSelectors';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import type { ReturnFromMaintenanceData } from '../../types/maintenance';

export function ReturnFromMaintenancePage() {
  const { maintenanceId } = useParams<{ maintenanceId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const maintenance = useAppSelector((state) =>
    maintenanceId ? selectMaintenanceById(maintenanceId)(state) : null
  );

  const [returnQuantity, setReturnQuantity] = useState(1);
  const [repairSummary, setRepairSummary] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [repairedBy, setRepairedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const displayUnit = maintenance?.unit || 'Pcs';

  useEffect(() => {
    if (!maintenance && maintenanceId) {
      dispatch(fetchMaintenanceById(maintenanceId));
    }
  }, [dispatch, maintenanceId, maintenance]);

  useEffect(() => {
    if (maintenance) {
      setReturnQuantity(maintenance.quantity);
    }
  }, [maintenance]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!returnQuantity || returnQuantity <= 0) {
      newErrors.returnQuantity = 'Return quantity is required';
    } else if (maintenance && returnQuantity > maintenance.quantity) {
      newErrors.returnQuantity = `Cannot exceed ${maintenance.quantity}`;
    }
    if (repairCost.trim()) {
      const isValid = /^\d+(\.\d{1,2})?$/.test(repairCost.trim());
      if (!isValid) {
        newErrors.repairCost = 'Invalid repair cost format (e.g., 123.45)';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [returnQuantity, repairCost, maintenance]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm() || !maintenance || !userId || !userName || !maintenanceId) return;

    const returnData: ReturnFromMaintenanceData = {
      returnQuantity,
      repairSummary: repairSummary.trim() || undefined,
      repairCost: repairCost.trim() ? parseFloat(repairCost) : undefined,
      repairedBy: repairedBy.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await dispatch(
        returnFromMaintenanceThunk({
          maintenanceId,
          returnData,
          userId,
          userName,
        })
      ).unwrap();
      navigate(`/maintenance/${maintenanceId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to return items';
      setErrors((prev) => ({ ...prev, returnQuantity: msg }));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validateForm,
    maintenance,
    userId,
    userName,
    returnQuantity,
    repairSummary,
    repairCost,
    repairedBy,
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
          <h1 className="text-[22px] font-semibold text-slate-900">Return from Maintenance</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-24">
          <LoadingSpinner className="h-10 w-10 text-blue-800" />
          <p className="mt-4 text-[15px] text-slate-500">Loading…</p>
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
        <h1 className="text-[22px] font-semibold text-slate-900">Return from Maintenance</h1>
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

        <div className="rounded-lg border border-amber-600/30 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <Icon name="exclamation-triangle" className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <p className="text-[13px] text-amber-800">
              {maintenance.quantity - returnQuantity > 0
                ? `Returning ${returnQuantity} of ${maintenance.quantity} ${displayUnit}. ${maintenance.quantity - returnQuantity} ${displayUnit} will remain in maintenance with 'Partial Return' status.`
                : `Returning all ${returnQuantity} ${displayUnit}. This record will be marked as 'Returned'.`}
            </p>
          </div>
        </div>

        <div>
          <label className="text-[15px] text-slate-900">
            Return Quantity <span className="text-red-600">*</span>
          </label>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setReturnQuantity((q) => Math.max(1, q - 1))}
              disabled={returnQuantity <= 1}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white disabled:opacity-50"
            >
              <Icon name="minus" className="h-5 w-5 text-blue-800" />
            </button>
            <input
              type="number"
              min={1}
              max={maintenance.quantity}
              value={returnQuantity}
              onChange={(e) => {
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num) && num > 0 && num <= maintenance.quantity) {
                  setReturnQuantity(num);
                }
              }}
              className="h-12 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-center text-xl font-bold text-slate-900"
            />
            <button
              type="button"
              onClick={() =>
                setReturnQuantity((q) => Math.min(maintenance.quantity, q + 1))
              }
              disabled={returnQuantity >= maintenance.quantity}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-800 bg-blue-800 disabled:opacity-50"
            >
              <Icon name="plus" className="h-5 w-5 text-white" />
            </button>
          </div>
          {errors.returnQuantity && (
            <p className="mt-1 text-[13px] text-red-600">{errors.returnQuantity}</p>
          )}
        </div>

        <div>
          <label className="text-[15px] text-slate-900">Repair Summary (Optional)</label>
          <textarea
            value={repairSummary}
            onChange={(e) => setRepairSummary(e.target.value)}
            placeholder="Describe the repairs performed"
            rows={4}
            className="mt-1.5 min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
          />
        </div>

        <div>
          <label className="text-[15px] text-slate-900">Repair Cost (Optional)</label>
          <div className="mt-1.5 flex">
            <span className="flex h-12 items-center justify-center rounded-l-lg border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-500">
              ₹
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={repairCost}
              onChange={(e) => {
                setRepairCost(e.target.value);
                if (errors.repairCost) setErrors((prev) => ({ ...prev, repairCost: '' }));
              }}
              placeholder="0.00"
              className={`h-12 flex-1 rounded-r-lg border border-l-0 px-4 text-[15px] text-slate-900 ${
                errors.repairCost ? 'border-red-600' : 'border-slate-200'
              } focus:outline-none focus:ring-1 focus:ring-blue-800`}
            />
          </div>
          {errors.repairCost && (
            <p className="mt-1 text-[13px] text-red-600">{errors.repairCost}</p>
          )}
        </div>

        <div>
          <label className="text-[15px] text-slate-900">Repaired By (Optional)</label>
          <input
            type="text"
            value={repairedBy}
            onChange={(e) => setRepairedBy(e.target.value)}
            placeholder="Name of repair person or vendor"
            className="mt-1.5 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-blue-800 text-[15px] font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoadingSpinner className="h-6 w-6 text-white" />
          ) : (
            <>
              <Icon name="arrow-uturn-left" className="h-5 w-5" />
              Return to Inventory
            </>
          )}
        </button>
      </div>
    </div>
  );
}
