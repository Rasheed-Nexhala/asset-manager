import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createRequest } from '../../store/thunks/requestThunks';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import { fetchSites } from '../../store/slices/sitesSlice';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsSiteManager,
} from '../../store/selectors/authSelectors';
import {
  selectSiteById,
  selectSitesLoading,
  selectAssignedSiteIdForUser,
} from '../../store/selectors/sitesSelectors';
import { FormField } from '../../components/auth/FormField';
import { PrioritySelector } from '../../components/requests';
import { RequestItemCard } from '../../components/requests/RequestItemCard';
import { ItemSelectorModal } from '../../components/shared/ItemSelectorModal';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import type { RequestPriority, CreateRequestData } from '../../types/request';
import type { Item } from '../../types/inventory';

interface FormErrors {
  priority?: string;
  items?: string;
  purpose?: string;
}

export function CreateRequestPage() {
  const [searchParams] = useSearchParams();
  const siteIdParam = searchParams.get('siteId');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const assignedSiteId = useAppSelector(selectAssignedSiteIdForUser(userId));
  const effectiveSiteId = siteIdParam || assignedSiteId || '';
  const site = useAppSelector(selectSiteById(effectiveSiteId));
  const sitesLoading = useAppSelector(selectSitesLoading);

  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [items, setItems] = useState<Array<Item & { quantity: number }>>([]);
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [itemSelectorOpen, setItemSelectorOpen] = useState(false);
  const isBusy = isSubmittingRequest || isSavingDraft;

  useEffect(() => {
    if (effectiveSiteId && !site) {
      dispatch(fetchSites());
    }
    dispatch(fetchItems(undefined));
  }, [dispatch, effectiveSiteId, site]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!priority) newErrors.priority = 'Priority is required';
    if (items.length === 0) newErrors.items = 'At least one item is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItems = useCallback((selected: Item[]) => {
    setItems((prev) => prev.concat(selected.map((i) => ({ ...i, quantity: 1 }))));
    setErrors((e) => ({ ...e, items: undefined }));
  }, []);

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!validateForm() && !isDraft) return;
    if (!site || !userId || !userName) {
      window.alert('Missing required user or site information');
      return;
    }

    if (isDraft) {
      setIsSavingDraft(true);
    } else {
      setIsSubmittingRequest(true);
    }

    const startedAt = Date.now();
    const MIN_LOADER_MS = 500;

    try {
      const requestData: CreateRequestData = {
        siteId: site.id,
        siteName: site.name,
        priority,
        purpose: purpose.trim() || undefined,
        items: items.map((item) => ({
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku,
          unit: item.unit,
          itemType: item.type === 'fuel' ? 'consumable' : item.type,
          categoryId: item.categoryId ?? '',
          categoryName: item.categoryName ?? '',
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          weightPerMeter: item.weightPerMeter,
          lengthPerPiece: item.lengthPerPiece,
        })),
      };

      await dispatch(
        createRequest({
          requestData,
          userId,
          userName,
          isDraft,
        })
      ).unwrap();

      window.alert(
        isDraft ? 'Request saved as draft' : 'Request submitted successfully'
      );
      navigate(isSiteManager ? '/requests/my-requests' : '/requests/queue');
    } catch (error: unknown) {
      window.alert(
        error instanceof Error ? error.message : 'Failed to create request'
      );
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      setTimeout(() => {
        setIsSavingDraft(false);
        setIsSubmittingRequest(false);
      }, remaining);
    }
  };

  if (effectiveSiteId && sitesLoading && !site) {
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
            New Request
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[15px] text-slate-500">
            Loading site information...
          </p>
        </div>
      </div>
    );
  }

  if (effectiveSiteId && !site) {
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
            New Request
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[15px] text-slate-500">Site not found</p>
        </div>
      </div>
    );
  }

  if (!effectiveSiteId && !site) {
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
            New Request
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[15px] text-slate-500">
            No site assigned. Please select a site from inventory or go to My
            Requests to create a request.
          </p>
          <button
            type="button"
            onClick={() => navigate('/requests/my-requests')}
            className="mt-4 px-6 py-3 bg-blue-800 text-white rounded-[10px] font-semibold hover:bg-blue-900"
          >
            My Requests
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
          New Request
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-[13px] text-slate-500 mb-1">Request for:</p>
          <p className="text-[17px] font-semibold text-slate-900">
            {site?.name}
          </p>
        </div>

        <PrioritySelector
          value={priority}
          onChange={(v) => {
            setPriority(v);
            setErrors((p) => ({ ...p, priority: undefined }));
          }}
          error={errors.priority}
        />

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[15px] font-medium text-slate-900">
              Items <span className="text-red-600">*</span>
            </label>
            <button
              type="button"
              onClick={() => setItemSelectorOpen(true)}
              className="flex items-center gap-1 text-[15px] font-semibold text-blue-800 hover:underline"
            >
              <Icon name="plus-circle" className="h-5 w-5" />
              Add Items
            </button>
          </div>

          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => (
                <RequestItemCard
                  key={item.id}
                  item={{
                    itemId: item.id,
                    itemName: item.name,
                    itemSku: item.sku,
                    unit: item.unit,
                    itemType: item.type === 'fuel' ? 'consumable' : item.type,
                    categoryId: item.categoryId ?? '',
                    categoryName: item.categoryName ?? '',
                    imageUrl: item.imageUrl,
                    quantityRequested: item.quantity,
                    quantityApproved: item.quantity,
                    quantityReturned: 0,
                    status: 'pending',
                    weightPerMeter: item.weightPerMeter,
                    lengthPerPiece: item.lengthPerPiece,
                  }}
                  mode="create"
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-6 items-center justify-center border border-dashed border-slate-200 flex flex-col">
              <Icon name="cube" className="h-12 w-12 text-slate-400" />
              <p className="text-[15px] text-slate-500 mt-2">
                No items added yet
              </p>
              <p className="text-[13px] text-slate-500 mt-1">
                Click &quot;Add Items&quot; to select items
              </p>
            </div>
          )}
          {errors.items && (
            <p className="text-[13px] text-red-600 mt-1">{errors.items}</p>
          )}
        </div>

        <FormField
          label="Purpose / Notes (optional)"
          value={purpose}
          onChange={setPurpose}
          placeholder="Describe the purpose of this request (optional)..."
          error={errors.purpose}
          multiline
          rows={4}
        />
      </div>

      <div className="bg-white border-t border-slate-200 pt-4 flex gap-3">
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={isBusy}
          className="flex-1 border-[1.5px] border-blue-800 rounded-[10px] h-[50px] flex items-center justify-center text-[15px] font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
        >
          {isSavingDraft ? <LoadingSpinner size="sm" /> : 'Save Draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={isBusy}
          className="flex-1 bg-blue-800 rounded-[10px] h-[50px] flex items-center justify-center text-[15px] font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
        >
          {isSubmittingRequest ? (
            <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
          ) : (
            'Submit Request'
          )}
        </button>
      </div>

      <ItemSelectorModal
        isOpen={itemSelectorOpen}
        onClose={() => setItemSelectorOpen(false)}
        onSelect={handleAddItems}
        excludeItemIds={items.map((i) => i.id)}
        allowedItemTypes={['consumable', 'non_consumable']}
      />
    </div>
  );
}

