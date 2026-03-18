import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  createItem,
  updateItem,
  fetchItemById,
  SKU_EXISTS_ERROR_MESSAGE,
} from '../../store/thunks/inventoryThunks';
import { selectAllCategories, selectItemsLoading } from '../../store/selectors/inventorySelectors';
import { useInventoryError } from '../../hooks/useInventoryError';
import { uploadItemImageFromBlob, deleteItemImageByUrl } from '../../services/firebase/storageService';
import type { Item, CreateItemData, UpdateItemData } from '../../types/inventory';
import { Icon } from '../../components/shared/Icon';
import { InventoryLoadingState } from '../../components/shared/InventoryLoadingState';
import { ItemForm } from '../../components/inventory/ItemForm';

function getCategoryName(categories: { id: string; name: string }[], categoryId: string | null): string {
  if (!categoryId) return 'Uncategorized';
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.name || 'Uncategorized';
}

export function AddEditItemPage() {
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId: string }>();
  const dispatch = useAppDispatch();
  const mode: 'create' | 'edit' = itemId ? 'edit' : 'create';

  const categories = useAppSelector(selectAllCategories);
  const isLoading = useAppSelector(selectItemsLoading);
  const reduxError = useInventoryError();

  const [item, setItem] = useState<Item | null>(null);
  const [loadingItem, setLoadingItem] = useState(mode === 'edit');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setError(reduxError ?? null);
  }, [reduxError]);

  useEffect(() => {
    if (mode === 'edit' && itemId) {
      dispatch(fetchItemById(itemId))
        .unwrap()
        .then(setItem)
        .catch((err) => setError(err?.message || 'Failed to load item'))
        .finally(() => setLoadingItem(false));
    }
  }, [mode, itemId, dispatch]);

  const initialData = useMemo<Partial<Item> | undefined>(() => {
    if (mode === 'edit' && item) {
      return {
        name: item.name,
        sku: item.sku,
        description: item.description,
        categoryId: item.categoryId,
        type: item.type,
        unit: item.unit,
        minStockLevel: item.minStockLevel,
        status: item.status,
        imageUrl: item.imageUrl,
        standardUnitPrice: item.standardUnitPrice,
        standardGstPercentage: item.standardGstPercentage,
        steelMasterId: item.steelMasterId,
        weightPerMeter: item.weightPerMeter,
        lengthPerPiece: item.lengthPerPiece,
        centralStoreQuantity: item.centralStoreQuantity,
        totalQuantity: item.totalQuantity,
      };
    }
    return undefined;
  }, [mode, item]);

  const handleSubmit = useCallback(
    async (data: CreateItemData | UpdateItemData, imageFile?: File) => {
      try {
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        if (mode === 'create') {
          const createData = data as CreateItemData;
          const categoryName = getCategoryName(categories, createData.categoryId ?? null);
          const createdItem = await dispatch(
            createItem({
              itemData: { ...createData, imageUrl: undefined },
              categoryName,
            })
          ).unwrap();

          let imageUrl: string | undefined;
          if (imageFile) {
            try {
              imageUrl = await uploadItemImageFromBlob(
                imageFile,
                createdItem.id,
                imageFile.name || `image_${Date.now()}.jpg`
              );
              await dispatch(updateItem({ itemId: createdItem.id, updates: { imageUrl } })).unwrap();
            } catch (imgErr) {
              if (imageUrl) await deleteItemImageByUrl(imageUrl);
              throw imgErr;
            }
          }

          setSuccess(true);
          setTimeout(() => navigate('/inventory/central'), 1000);
        } else {
          if (!itemId) {
            setError('Item ID is required');
            setIsSubmitting(false);
            return;
          }
          const updateData = data as UpdateItemData;
          const categoryName = updateData.categoryId
            ? getCategoryName(categories, updateData.categoryId)
            : undefined;

          let uploadedImageUrl: string | undefined;
          if (imageFile) {
            const imageUrl = await uploadItemImageFromBlob(
              imageFile,
              itemId,
              imageFile.name || `image_${Date.now()}.jpg`
            );
            updateData.imageUrl = imageUrl;
            uploadedImageUrl = imageUrl;
          } else if (initialData?.imageUrl && !(data as UpdateItemData).imageUrl) {
            updateData.imageUrl = '';
          }

          try {
            await dispatch(
              updateItem({ itemId, updates: updateData, categoryName })
            ).unwrap();
          } catch (updateErr) {
            if (uploadedImageUrl) await deleteItemImageByUrl(uploadedImageUrl);
            throw updateErr;
          }

          setSuccess(true);
          setTimeout(() => navigate(-1), 1000);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save item';
        setError(msg);
        if (msg === SKU_EXISTS_ERROR_MESSAGE || (msg.toLowerCase().includes('sku') && msg.toLowerCase().includes('already exists'))) {
          window.alert(`Duplicate SKU: ${SKU_EXISTS_ERROR_MESSAGE}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [mode, itemId, dispatch, navigate, categories, initialData?.imageUrl]
  );

  const handleCancel = useCallback(() => navigate(-1), [navigate]);

  if (loadingItem) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
          <button type="button" onClick={handleCancel} className="w-12 h-12 -ml-2 flex items-center justify-center" aria-label="Go back">
            <Icon name="arrow-left" className="w-6 h-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900 flex-1">
            {mode === 'create' ? 'Add New Item' : 'Edit Item'}
          </h1>
        </header>
        <InventoryLoadingState message="Loading item data..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
        <button type="button" onClick={handleCancel} className="w-12 h-12 -ml-2 flex items-center justify-center" aria-label="Go back">
          <Icon name="arrow-left" className="w-6 h-6" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900 flex-1">
          {mode === 'create' ? 'Add New Item' : 'Edit Item'}
        </h1>
      </header>

      {success && (
        <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-3 mx-4 mt-3 flex items-center gap-2">
          <Icon name="check-circle" className="w-5 h-5 text-green-600" />
          <p className="text-[13px] text-green-600">
            {mode === 'create' ? 'Item created successfully' : 'Item updated successfully'}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3 mx-4 mt-3 flex items-start gap-2">
          <Icon name="exclamation-triangle" className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-[13px] text-red-600 flex-1">{error}</p>
          <button type="button" onClick={() => setError(null)} className="p-1" aria-label="Dismiss">
            <Icon name="x-mark" className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <ItemForm
          mode={mode}
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={isSubmitting || isLoading}
          onManageSteelMaster={() => navigate('/inventory/steel-master')}
        />
      </div>
    </div>
  );
}
