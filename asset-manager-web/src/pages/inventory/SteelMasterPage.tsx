import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  fetchSteelMasters,
  updateSteelMaster,
  deleteSteelMaster,
} from '../../store/thunks/steelMasterThunks';
import {
  selectActiveSteelMasters,
  selectSteelMasterLoading,
} from '../../store/selectors/steelMasterSelectors';
import { useConfirm } from '../../hooks';
import { useToast } from '../../contexts/ToastContext';
import { subscribeSteelMasters } from '../../services/firebase/steelMasterService';
import { setSteelMasters } from '../../store/slices/steelMasterSlice';
import type { SteelMaster } from '../../types/steelMaster';
import { InventorySubNav } from '../../components/inventory';
import { Icon } from '../../components/shared/Icon';
import { InventoryLoadingState } from '../../components/shared/InventoryLoadingState';

export function SteelMasterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);

  const steelMasters = useAppSelector(selectActiveSteelMasters);
  const isLoading = useAppSelector(selectSteelMasterLoading);
  const { confirm, confirmationModal } = useConfirm();
  const toast = useToast();

  useEffect(() => {
    dispatch(fetchSteelMasters(true));
    const unsub = subscribeSteelMasters(
      (masters: SteelMaster[]) => {
        dispatch(setSteelMasters(masters.filter((m) => m.isActive)));
      },
      true
    );
    return () => unsub();
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchSteelMasters(true)).finally(() => setRefreshing(false));
  }, [dispatch]);

  const handleAdd = useCallback(() => navigate('/inventory/custom/add'), [navigate]);

  const handleEdit = useCallback(
    (master: SteelMaster) => navigate(`/inventory/custom/${master.id}/edit`),
    [navigate]
  );

  const handleDelete = useCallback(
    async (master: SteelMaster) => {
      const ok = await confirm({
        title: 'Deactivate Custom Item?',
        message: `Are you sure you want to deactivate "${master.name}"? It will no longer appear in the list but linked items will keep their configuration.`,
        variant: 'danger',
      });
      if (!ok) return;
      dispatch(deleteSteelMaster(master.id)).catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to deactivate');
      });
    },
    [dispatch, confirm, toast]
  );

  return (
    <div className="flex flex-col h-full">
      <InventorySubNav />
      <header className="bg-white border-b border-slate-200 px-4 flex items-center justify-between h-14">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-12 h-12 flex items-center justify-center -ml-2"
          aria-label="Go back"
        >
          <Icon name="arrow-left" className="w-6 h-6 text-slate-900" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900 flex-1 text-center">
          Custom Items
        </h1>
        <button
          type="button"
          onClick={handleAdd}
          className="w-12 h-12 flex items-center justify-center rounded-[10px]"
          aria-label="Add custom item"
        >
          <Icon name="plus-circle" className="w-6 h-6 text-blue-800" />
        </button>
      </header>

      {isLoading && steelMasters.length === 0 ? (
        <InventoryLoadingState message="Loading custom items..." />
      ) : steelMasters.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="chart-bar-square" className="w-20 h-20 text-slate-400" />
          <h2 className="text-[22px] font-semibold text-slate-900 text-center mb-2 mt-4">
            No Custom Items
          </h2>
          <p className="text-[15px] text-slate-500 text-center mb-6">
            Add standard custom item specifications for KG-to-pieces conversion.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="bg-blue-800 rounded-[10px] h-[50px] px-6 flex items-center justify-center gap-2 text-white font-semibold"
          >
            <Icon name="plus-circle" className="w-5 h-5" />
            Add Custom Item
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <div className="flex flex-col gap-3">
            {steelMasters.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-[10px] p-4 border border-slate-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[15px] font-semibold text-slate-900 flex-1">{item.name}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center rounded-lg border border-slate-200"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Icon name="pencil-square" className="w-4 h-4 text-blue-800" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center rounded-lg border border-slate-200"
                      aria-label={`Deactivate ${item.name}`}
                    >
                      <Icon name="trash" className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[13px] text-slate-500">Weight/m</p>
                    <p className="text-[15px] text-slate-900">{item.weightPerMeter} kg/m</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] text-slate-500">Default Length</p>
                    <p className="text-[15px] text-slate-900">{item.defaultLength}m</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] text-slate-500">SKU</p>
                    <p className="text-[15px] text-slate-900">{item.hsnCode}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmationModal}
    </div>
  );
}
