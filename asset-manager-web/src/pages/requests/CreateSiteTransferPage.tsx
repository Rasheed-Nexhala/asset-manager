import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createRequest } from '../../store/thunks/requestThunks';
import { fetchSites } from '../../store/slices/sitesSlice';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
import { selectSiteById } from '../../store/selectors/sitesSelectors';
import { FormField } from '../../components/auth/FormField';
import { PrioritySelector } from '../../components/requests';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import type { RequestPriority } from '../../types/request';

interface LocationState {
  sourceSiteId: string;
  sourceSiteName: string;
  destinationSiteId: string;
  destinationSiteName: string;
  preselectedItem: {
    itemId: string;
    itemName: string;
    itemSku: string;
    unit?: string;
    itemType: string;
    categoryId: string;
    categoryName: string;
    imageUrl?: string;
    availableQty: number;
    weightPerMeter?: number;
    lengthPerPiece?: number;
  };
}

interface FormErrors {
  quantity?: string;
  purpose?: string;
}

export function CreateSiteTransferPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const state = location.state as LocationState | null;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);

  const destinationSite = useAppSelector(
    selectSiteById(state?.destinationSiteId ?? '')
  );

  useEffect(() => {
    if (!state) {
      navigate('/inventory/other-sites', { replace: true });
      return;
    }
    if (!destinationSite) {
      dispatch(fetchSites());
    }
  }, [state, destinationSite, dispatch, navigate]);

  const [quantity, setQuantity] = useState('1');
  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!state) {
    return null;
  }

  const {
    sourceSiteId,
    sourceSiteName,
    destinationSiteId,
    destinationSiteName,
    preselectedItem,
  } = state;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const qty = parseInt(quantity, 10);

    if (!quantity.trim() || isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    } else if (qty > preselectedItem.availableQty) {
      newErrors.quantity = `Maximum available at ${sourceSiteName}: ${preselectedItem.availableQty}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !userId || !userName) return;

    const qty = parseInt(quantity, 10);

    setIsSubmitting(true);
    try {
      await dispatch(
        createRequest({
          requestData: {
            siteId: destinationSiteId,
            siteName: destinationSiteName,
            requestType: 'site_transfer',
            sourceSiteId,
            sourceSiteName,
            priority,
            purpose: purpose.trim() || `Site transfer from ${sourceSiteName}`,
            items: [
              {
                itemId: preselectedItem.itemId,
                itemName: preselectedItem.itemName,
                itemSku: preselectedItem.itemSku,
                unit: preselectedItem.unit,
                itemType: preselectedItem.itemType as
                  | 'consumable'
                  | 'non_consumable'
                  | 'fuel',
                categoryId: preselectedItem.categoryId,
                categoryName: preselectedItem.categoryName,
                imageUrl: preselectedItem.imageUrl,
                quantity: qty,
                weightPerMeter: preselectedItem.weightPerMeter,
                lengthPerPiece: preselectedItem.lengthPerPiece,
              },
            ],
          },
          userId,
          userName,
          isDraft: false,
        })
      ).unwrap();

      toast.success(
        `Your transfer request for "${preselectedItem.itemName}" has been submitted. Store Incharge will review it shortly.`
      );
      navigate('/requests/my-requests');
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to submit transfer request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
          Request Transfer
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        <div className="bg-indigo-500/10 rounded-[10px] p-4 border border-indigo-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="arrows-right-left" className="h-5 w-5 text-indigo-600" />
            <span className="text-[13px] font-semibold text-indigo-600">
              Site Transfer Request
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-white rounded-lg px-3 py-1.5 border border-slate-200">
              <p className="text-[13px] text-slate-500">From</p>
              <p className="text-[14px] font-semibold text-slate-900">
                {sourceSiteName}
              </p>
            </div>
            <Icon name="arrow-right" className="h-5 w-5 text-indigo-500" />
            <div className="bg-white rounded-lg px-3 py-1.5 border border-slate-200">
              <p className="text-[13px] text-slate-500">To</p>
              <p className="text-[14px] font-semibold text-slate-900">
                {destinationSiteName}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[10px] p-4 border border-slate-200">
          <p className="text-[13px] text-slate-500 mb-2">Item to Transfer</p>
          <p className="text-[15px] font-semibold text-slate-900 mb-1">
            {preselectedItem.itemName}
          </p>
          <p className="text-[13px] text-slate-500">
            SKU: {preselectedItem.itemSku}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <Icon name="cube" className="h-4 w-4 text-slate-500" />
            <span className="text-[13px] text-slate-500">
              Available at {sourceSiteName}:{' '}
              <span className="font-semibold text-slate-900">
                {preselectedItem.availableQty}{' '}
                {preselectedItem.unit ?? 'units'}
              </span>
            </span>
          </div>
        </div>

        <FormField
          label="Quantity"
          required
          value={quantity}
          onChange={(v) => {
            setQuantity(v);
            setErrors((p) => ({ ...p, quantity: undefined }));
          }}
          placeholder={`Max ${preselectedItem.availableQty}`}
          error={errors.quantity}
        />

        <div>
          <label className="block text-[15px] font-medium text-slate-900 mb-2">
            Priority
          </label>
          <PrioritySelector value={priority} onChange={setPriority} />
        </div>

        <FormField
          label="Purpose / Notes"
          value={purpose}
          onChange={(v) => {
            setPurpose(v);
            setErrors((p) => ({ ...p, purpose: undefined }));
          }}
          placeholder={`Reason for requesting transfer from ${sourceSiteName}...`}
          multiline
          rows={3}
          error={errors.purpose}
        />

        <div className="bg-slate-50 rounded-[10px] p-4 border border-slate-200">
          <div className="flex items-start gap-2">
            <Icon
              name="question-mark-circle"
              className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5"
            />
            <p className="text-[13px] text-slate-500">
              This request will be reviewed by the Store Incharge or Super Admin. Once
              approved and confirmed, the item will be moved from {sourceSiteName}{' '}
              to {destinationSiteName}.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full bg-indigo-600 rounded-[10px] h-[50px] flex items-center justify-center gap-2 text-[15px] font-semibold text-white hover:bg-indigo-700 ${
            isSubmitting ? 'opacity-70' : ''
          }`}
        >
          {isSubmitting ? (
            <LoadingSpinner size="sm" className="!border-indigo-200 !border-t-white" />
          ) : (
            <>
              <Icon name="arrows-right-left" className="h-5 w-5" />
              Submit Transfer Request
            </>
          )}
        </button>
      </div>
    </div>
  );
}
