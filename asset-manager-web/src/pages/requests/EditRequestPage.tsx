import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  editRequest,
  submitDraftRequest,
  deleteRequest,
} from '../../store/thunks/requestThunks';
import { requestService } from '../../services/firebase/requestService';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsSiteManager,
} from '../../store/selectors/authSelectors';
import { FormField } from '../../components/auth/FormField';
import { PrioritySelector } from '../../components/requests';
import { RequestItemCard } from '../../components/requests/RequestItemCard';
import { ItemSelectorModal } from '../../components/shared/ItemSelectorModal';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import type {
  RequestPriority,
  EditRequestData,
  RequestItem,
} from '../../types/request';

interface FormErrors {
  priority?: string;
  items?: string;
  purpose?: string;
}

export function EditRequestPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isSiteManager = useAppSelector(selectIsSiteManager);

  const [request, setRequest] = useState<{
    id: string;
    siteName?: string;
    priority: RequestPriority;
    purpose: string;
    items: RequestItem[];
  } | null>(null);
  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [items, setItems] = useState<RequestItem[]>([]);
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemSelectorOpen, setItemSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isBusy = isSavingDraft || isSubmittingRequest || isDeleting;
  const hasItems = items.length > 0;

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    requestService
      .getRequestById(requestId)
      .then((r) => {
        if (!cancelled && r && r.status === 'draft') {
          setRequest(r);
          setPriority(r.priority);
          setPurpose(r.purpose ?? '');
          setItems(r.items ?? []);
        } else if (!cancelled) {
          window.alert('Only draft requests can be edited');
          navigate(-1);
        }
      })
      .catch(() => {
        if (!cancelled) {
          window.alert('Failed to load request');
          navigate(-1);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, navigate]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!priority) newErrors.priority = 'Priority is required';
    if (items.length === 0) newErrors.items = 'At least one item is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItems = useCallback((selected: import('../../types/inventory').Item[]) => {
    const newItems: RequestItem[] = selected.map((item) => ({
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      unit: item.unit,
      itemType: (item.type === 'fuel' ? 'consumable' : item.type) as 'consumable' | 'non_consumable',
      categoryId: item.categoryId ?? '',
      categoryName: item.categoryName ?? '',
      imageUrl: item.imageUrl,
      quantityRequested: 1,
      quantityApproved: 1,
      quantityReturned: 0,
      status: 'pending',
    }));
    setItems((prev) => prev.concat(newItems));
    setErrors((e) => ({ ...e, items: undefined }));
  }, []);

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId
          ? {
              ...item,
              quantityRequested: quantity,
              quantityApproved: quantity,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const handleDeleteDraft = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete this draft? This cannot be undone.')) return;
    if (!userId || !requestId) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteRequest({ requestId, userId })).unwrap();
      window.alert('Draft deleted');
      navigate(isSiteManager ? '/requests/my-requests' : '/requests/queue');
    } catch (error: unknown) {
      window.alert(
        error instanceof Error ? error.message : 'Failed to delete draft'
      );
    } finally {
      setIsDeleting(false);
    }
  }, [requestId, userId, dispatch, navigate, isSiteManager]);

  const handleSubmit = async (isDraft: boolean = true) => {
    if (!isDraft && !validateForm()) return;
    if (!userId || !userName || !requestId) return;

    if (isDraft) {
      setIsSavingDraft(true);
    } else {
      setIsSubmittingRequest(true);
    }

    const startedAt = Date.now();
    const MIN_LOADER_MS = 500;

    try {
      const updates: EditRequestData = { priority, purpose, items };

      await dispatch(
        editRequest({
          requestId,
          updates,
          editedBy: userId,
          editedByName: userName,
        })
      ).unwrap();

      if (!isDraft) {
        await dispatch(submitDraftRequest({ requestId, userId })).unwrap();
      }

      window.alert(
        isDraft ? 'Draft saved successfully' : 'Request submitted successfully'
      );
      navigate(isSiteManager ? '/requests/my-requests' : '/requests/queue');
    } catch (error: unknown) {
      window.alert(
        error instanceof Error ? error.message : 'Failed to update request'
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

  if (isLoading || !request) {
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
            Edit Request
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
          Edit Request
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-[13px] text-slate-500 mb-1">Editing draft request</p>
          <p className="text-[17px] font-semibold text-slate-900">
            {request.siteName}
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
                  key={item.itemId}
                  item={item}
                  mode="edit"
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-6 border border-dashed border-slate-200 flex flex-col items-center justify-center">
              <Icon name="cube" className="h-12 w-12 text-slate-400" />
              <p className="text-[15px] text-slate-500 mt-2">
                No items added yet
              </p>
            </div>
          )}
          {errors.items && (
            <p className="text-[13px] text-red-600 mt-1">{errors.items}</p>
          )}
        </div>

        <FormField
          label="Purpose / Notes"
          value={purpose}
          onChange={setPurpose}
          placeholder="Describe the purpose of this request..."
          error={errors.purpose}
          multiline
          rows={4}
        />
      </div>

      <div className="bg-white border-t border-slate-200 pt-4 space-y-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isBusy || !hasItems}
            className="flex-1 border-[1.5px] border-blue-800 rounded-[10px] h-[50px] flex items-center justify-center text-[15px] font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
          >
            {isSavingDraft ? <LoadingSpinner size="sm" /> : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isBusy || !hasItems}
            className="flex-1 bg-blue-800 rounded-[10px] h-[50px] flex items-center justify-center text-[15px] font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
          >
            {isSubmittingRequest ? (
              <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
            ) : (
              'Submit Request'
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleDeleteDraft}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 pt-3 border-t border-slate-200 text-[15px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {isDeleting ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Icon name="trash" className="h-5 w-5" />
              Delete Draft
            </>
          )}
        </button>
      </div>

      <ItemSelectorModal
        isOpen={itemSelectorOpen}
        onClose={() => setItemSelectorOpen(false)}
        onSelect={handleAddItems}
        excludeItemIds={items.map((i) => i.itemId)}
        allowedItemTypes={['consumable', 'non_consumable']}
      />
    </div>
  );
}
