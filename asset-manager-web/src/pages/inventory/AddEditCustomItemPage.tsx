import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  createSteelMaster,
  updateSteelMaster,
  fetchSteelMasterById,
} from '../../store/thunks/steelMasterThunks';
import { clearSteelMasterError } from '../../store/slices/steelMasterSlice';
import {
  selectSteelMasterError,
  selectSteelMasterLoading,
} from '../../store/selectors/steelMasterSelectors';
import type { SteelMaster, CreateSteelMasterData, UpdateSteelMasterData } from '../../types/steelMaster';
import { Icon } from '../../components/shared/Icon';
import { SteelMasterForm } from '../../components/inventory/SteelMasterForm';

export function AddEditCustomItemPage() {
  const navigate = useNavigate();
  const { customItemId } = useParams<{ customItemId: string }>();
  const dispatch = useAppDispatch();
  const mode: 'create' | 'edit' = customItemId ? 'edit' : 'create';

  const error = useAppSelector(selectSteelMasterError);
  const [editingMaster, setEditingMaster] = useState<SteelMaster | null>(null);
  const [loadingItem, setLoadingItem] = useState(mode === 'edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && customItemId) {
      setLoadingItem(true);
      dispatch(fetchSteelMasterById(customItemId))
        .unwrap()
        .then(setEditingMaster)
        .catch(() => setEditingMaster(null))
        .finally(() => setLoadingItem(false));
    }
  }, [mode, customItemId, dispatch]);

  const handleSubmit = useCallback(
    async (data: CreateSteelMasterData | UpdateSteelMasterData) => {
      setIsSubmitting(true);
      dispatch(clearSteelMasterError());
      try {
        if (editingMaster) {
          await dispatch(
            updateSteelMaster({ id: editingMaster.id, updates: data as UpdateSteelMasterData })
          ).unwrap();
        } else {
          await dispatch(createSteelMaster(data as CreateSteelMasterData)).unwrap();
        }
        navigate(-1);
      } finally {
        setIsSubmitting(false);
      }
    },
    [dispatch, editingMaster, navigate]
  );

  const handleCancel = useCallback(() => {
    dispatch(clearSteelMasterError());
    navigate(-1);
  }, [dispatch, navigate]);

  const title = mode === 'create' ? 'Add Custom Item' : 'Edit Custom Item';

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
        <button
          type="button"
          onClick={handleCancel}
          className="w-12 h-12 -ml-2 flex items-center justify-center"
          aria-label="Go back"
        >
          <Icon name="arrow-left" className="w-6 h-6" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900 flex-1">{title}</h1>
      </header>

      {loadingItem ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-[15px] text-slate-500">Loading custom item...</p>
        </div>
      ) : (
        <SteelMasterForm
          mode={mode}
          initialData={editingMaster}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={isSubmitting}
          error={error}
        />
      )}
    </div>
  );
}
