import { useEffect, useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchItemById, adjustQuantity, deleteItem } from '../../store/thunks/inventoryThunks';
import { createInventoryUpdateRequest } from '../../store/thunks/inventoryUpdateRequestThunks';
import {
  selectItemById,
  selectItemsLoading,
  selectItemsError,
} from '../../store/selectors/inventorySelectors';
import {
  selectIsAdminOrSuperAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
  selectRoleLoading,
  selectIsRoleLoaded,
} from '../../store/selectors/authSelectors';
import { selectCanStoreInchargeAdjustInventory, selectMyAccessGrantedUntil } from '../../store/selectors/inventoryUpdateRequestSelectors';
import { updateItemInState, clearError } from '../../store/slices/inventorySlice';
import { subscribeItemById, subscribeInventoryByItemId } from '../../services/firebase/inventoryService';
import { checkCanDeleteItem } from '../../services/firebase/inventoryDeletionService';
import { isLowStock, getItemTypeDetails } from '../../utils/inventoryUtils';
import { isWeightViewSupported } from '../../utils/weightConversionUtils';
import { getDisplayCategoryName } from '../../types/inventory';
import type { Item, AdjustmentData, AdjustmentType, InventoryEntry } from '../../types/inventory';
import { Icon } from '../../components/shared/Icon';
import { WeightDisplay } from '../../components/inventory/WeightDisplay';
import { ViewModeToggle } from '../../components/inventory/ViewModeToggle';
import { RequestAccessBanner } from '../../components/inventory/RequestAccessBanner';
import { RequestInventoryAccessModal } from '../../components/inventory/RequestInventoryAccessModal';
import { InventoryAdjustmentModal } from '../../components/inventory/InventoryAdjustmentModal';
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import { useConfirm } from '../../hooks';
import { useToast } from '../../contexts/ToastContext';
import { InventoryLoadingState } from '../../components/shared/InventoryLoadingState';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';

type StockStatus = 'adequate' | 'low_stock' | 'discontinued';
type LocationType = 'store' | 'site' | 'maintenance';

const LOCATION_ORDER: Record<LocationType, number> = {
  store: 0,
  site: 1,
  maintenance: 2,
};

function StockDistributionBreakdown({
  entries,
  item,
  viewMode,
}: {
  entries: InventoryEntry[];
  item: Item;
  viewMode: 'pieces' | 'kg';
}) {
  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const oa = LOCATION_ORDER[a.locationType as LocationType] ?? 2;
        const ob = LOCATION_ORDER[b.locationType as LocationType] ?? 2;
        if (oa !== ob) return oa - ob;
        return (a.locationName ?? '').localeCompare(b.locationName ?? '');
      }),
    [entries]
  );
  if (sorted.length === 0) return null;
  const getIcon = (t: string) => {
    if (t === 'store') return 'building-storefront';
    if (t === 'maintenance') return 'wrench-screwdriver';
    return 'map-pin';
  };
  return (
    <div className="mt-3 bg-white rounded-[10px] p-4 border border-slate-200">
      <p className="text-[15px] font-semibold text-slate-900 mb-3">By Location</p>
      <div className="flex flex-col gap-3">
        {sorted.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between py-2 border-b border-slate-200 last:border-b-0"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Icon name={getIcon(entry.locationType) as 'building-storefront' | 'wrench-screwdriver' | 'map-pin'} className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <span className="text-[15px] text-slate-900 truncate">
                {entry.locationName || entry.locationId || 'Unknown'}
              </span>
            </div>
            <WeightDisplay
              quantity={entry.quantity}
              weightPerMeter={item.weightPerMeter}
              lengthPerPiece={entry.lengthPerPiece ?? item.lengthPerPiece}
              viewMode={viewMode}
              unit={item.unit}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const item = useAppSelector((s) => (itemId ? selectItemById(itemId)(s) : null));
  const isLoading = useAppSelector(selectItemsLoading);
  const error = useAppSelector(selectItemsError);
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const isRoleLoaded = useAppSelector(selectIsRoleLoaded);
  const canEditItem = isAdminOrSuperAdmin || isStoreIncharge;
  const canStoreInchargeAdjustBase = useAppSelector(selectCanStoreInchargeAdjustInventory);
  const canStoreInchargeAdjust = canStoreInchargeAdjustBase || item?.type === 'fuel';
  const isAdjustmentReady = isRoleLoaded;
  const myAccessGrantedUntil = useAppSelector(selectMyAccessGrantedUntil);

  const { viewMode, toggleViewMode } = useWeightViewPreference();
  const { confirm, confirmationModal } = useConfirm();
  const toast = useToast();
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentType | null>(null);
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [inventoryByLocation, setInventoryByLocation] = useState<InventoryEntry[]>([]);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSteelItem = item ? isWeightViewSupported(item) : false;
  const canDeleteItem =
    canEditItem &&
    (item?.atSitesQuantity ?? 0) === 0 &&
    (item?.inMaintenanceQuantity ?? 0) === 0;

  useEffect(() => {
    if (!item && itemId && !isLoading) dispatch(fetchItemById(itemId));
  }, [dispatch, itemId, item, isLoading]);

  useEffect(() => {
    if (!itemId) return;
    const unsub = subscribeItemById(itemId, (updated) => {
      if (updated) dispatch(updateItemInState(updated));
    });
    return () => unsub();
  }, [itemId, dispatch]);

  useEffect(() => {
    if (!itemId) return;
    const unsub = subscribeInventoryByItemId(itemId, (entries) => {
      setInventoryByLocation(entries);
    });
    return () => unsub();
  }, [itemId]);

  const stockStatus: StockStatus = useMemo(() => {
    if (!item) return 'adequate';
    if (item.status === 'discontinued') return 'discontinued';
    if (isLowStock(item)) return 'low_stock';
    return 'adequate';
  }, [item]);

  const typeDetails = useMemo(() => getItemTypeDetails(item?.type), [item]);

  const handleEdit = useCallback(() => {
    if (itemId) navigate(`/inventory/${itemId}/edit`);
  }, [navigate, itemId]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleStockSubmit = useCallback(
    async (data: AdjustmentData) => {
      setIsSubmitting(true);
      try {
        await dispatch(adjustQuantity(data)).unwrap();
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to add stock');
      } finally {
        setIsSubmitting(false);
      }
    },
    [dispatch]
  );

  const handleRequestAccessSubmit = useCallback(
    async (data: { reason: string; notes?: string }) => {
      const reason = data.reason.trim() + (data.notes?.trim() ? ` - ${data.notes.trim()}` : '');
      setIsRequestingAccess(true);
      try {
        await dispatch(createInventoryUpdateRequest(reason)).unwrap();
        setShowRequestAccessModal(false);
        toast.success('Request Submitted. Admin will review it shortly.');
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to submit request');
      } finally {
        setIsRequestingAccess(false);
      }
    },
    [dispatch]
  );

  const handleDeletePress = useCallback(async () => {
    if (!itemId || !item) return;
    setIsCheckingDelete(true);
    try {
      const result = await checkCanDeleteItem(itemId, {
        totalQuantity: item.totalQuantity,
        atSitesQuantity: item.atSitesQuantity,
        inMaintenanceQuantity: item.inMaintenanceQuantity,
      });
      if (!result.canDelete) {
        toast.error(result.reason ?? 'This item cannot be deleted.');
        return;
      }
      const ok = await confirm({
        title: 'Delete Item?',
        message: `Delete ${item.name}? This cannot be undone. Historical POs and maintenance records will keep the item name for reference.`,
        variant: 'danger',
      });
      if (!ok) return;
      setIsDeleting(true);
      await dispatch(deleteItem(itemId)).unwrap();
      toast.success('Item deleted.');
      navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setIsCheckingDelete(false);
      setIsDeleting(false);
    }
  }, [itemId, item, dispatch, navigate, confirm, toast]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const formatAccessExpiry = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });

  if (isLoading && !item) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
          <button type="button" onClick={handleBack} className="w-12 h-12 -ml-2 flex items-center justify-center" aria-label="Go back">
            <Icon name="arrow-left" className="w-6 h-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900 flex-1">Item Details</h1>
        </header>
        <InventoryLoadingState message="Loading item details..." />
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
          <button type="button" onClick={handleBack} className="w-12 h-12 -ml-2 flex items-center justify-center" aria-label="Go back">
            <Icon name="arrow-left" className="w-6 h-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900 flex-1">Item Details</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="exclamation-circle" className="w-12 h-12 text-red-600" />
          <h2 className="text-[17px] font-semibold text-slate-900 mt-4 text-center">Error Loading Item</h2>
          <p className="text-[15px] text-slate-500 mt-2 text-center">{error}</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-6 bg-blue-800 rounded-[10px] h-[50px] px-6 flex items-center justify-center text-white font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
          <button type="button" onClick={handleBack} className="w-12 h-12 -ml-2 flex items-center justify-center" aria-label="Go back">
            <Icon name="arrow-left" className="w-6 h-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900 flex-1">Item Details</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="cube" className="w-12 h-12 text-slate-400" />
          <h2 className="text-[17px] font-semibold text-slate-900 mt-4 text-center">Item Not Found</h2>
          <p className="text-[15px] text-slate-500 mt-2 text-center">
            The item you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-6 bg-blue-800 rounded-[10px] h-[50px] px-6 flex items-center justify-center text-white font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusBadgeClass =
    stockStatus === 'low_stock'
      ? 'bg-amber-600/15 text-amber-600'
      : stockStatus === 'discontinued'
      ? 'bg-slate-600/15 text-slate-600'
      : 'bg-green-600/15 text-green-600';
  const statusLabel =
    stockStatus === 'low_stock' ? 'Low Stock' : stockStatus === 'discontinued' ? 'Discontinued' : 'In Stock';

  const filteredEntries = (
    item.type === 'fuel'
      ? inventoryByLocation.filter((e) => e.locationType === 'store')
      : inventoryByLocation
  ).filter((e) => e.quantity > 0);

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
        <button type="button" onClick={handleBack} className="w-12 h-12 -ml-2 flex items-center justify-center" aria-label="Go back">
          <Icon name="arrow-left" className="w-6 h-6" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900 flex-1">Item Details</h1>
        {canEditItem && (
          <button
            type="button"
            onClick={handleEdit}
            className="w-12 h-12 flex items-center justify-center"
            aria-label="Edit item"
          >
            <Icon name="pencil-square" className="w-5 h-5 text-blue-800" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="bg-white rounded-[10px] p-4 border border-slate-200 mb-3">
          <div className="w-full h-64 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden mb-4">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icon name="cube" className="w-16 h-16 text-slate-400" />
            )}
          </div>
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 mr-3">
              <h2 className="text-[22px] font-semibold text-slate-900 mb-2">{item.name}</h2>
              <p className="text-[13px] text-slate-500">SKU: {item.sku}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-[12px] font-medium ${statusBadgeClass}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[10px] p-4 border border-slate-200 mb-3">
          <h3 className="text-[17px] font-semibold text-slate-900 mb-4">Basic Information</h3>
          <div className="flex flex-col gap-4">
            <InfoRow label="Type" value={typeDetails.label} />
            <InfoRow label="Category" value={getDisplayCategoryName(item.categoryName)} />
            <InfoRow label="Unit" value={item.unit} />
            {item.description && (
              <div>
                <p className="text-[13px] text-slate-500 mb-1.5">Description</p>
                <p className="text-[15px] text-slate-900">{item.description}</p>
              </div>
            )}
            {(isAdminOrSuperAdmin || isStoreIncharge) && (
              <>
                <InfoRow
                  label="Standard Unit Price"
                  value={
                    item.standardUnitPrice != null && item.standardUnitPrice > 0
                      ? `₹${item.standardUnitPrice.toLocaleString('en-IN')}`
                      : '—'
                  }
                />
                <InfoRow
                  label="Standard GST"
                  value={
                    item.standardGstPercentage != null && item.standardGstPercentage > 0
                      ? `${item.standardGstPercentage}%`
                      : '—'
                  }
                />
              </>
            )}
          </div>
        </div>

        {!isSiteManager && (
          <button
            type="button"
            onClick={() => navigate(`/inventory/${itemId}/history`)}
            className="w-full bg-white rounded-[10px] p-4 border border-slate-200 mb-3 flex items-center justify-between min-h-[48px] text-left hover:bg-slate-50 transition-colors"
            aria-label="View item activity history"
          >
            <span className="text-[17px] font-semibold text-slate-900">Item activity history</span>
            <Icon name="chevron-right" className="w-5 h-5 text-slate-500 flex-shrink-0" />
          </button>
        )}

        {item.type !== 'fuel' && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[17px] font-semibold text-slate-900">Stock Distribution</p>
              {isSteelItem && <ViewModeToggle viewMode={viewMode} onToggle={toggleViewMode} />}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StockCard
                iconName="cube"
                label="Total Stock"
                item={item}
                quantity={item.totalQuantity}
                viewMode={viewMode}
              />
              <StockCard
                iconName="building-storefront"
                label="Central Store"
                item={item}
                quantity={item.centralStoreQuantity}
                viewMode={viewMode}
              />
              <StockCard
                iconName="map-pin"
                label="At Sites"
                item={item}
                quantity={item.atSitesQuantity}
                viewMode={viewMode}
              />
              <StockCard
                iconName="wrench-screwdriver"
                label="Maintenance"
                item={item}
                quantity={item.inMaintenanceQuantity}
                viewMode={viewMode}
              />
            </div>
          </div>
        )}

        <StockDistributionBreakdown
          entries={filteredEntries}
          item={item}
          viewMode={viewMode}
        />

        {canEditItem && (
          <div className="bg-white rounded-[10px] p-4 border border-slate-200 mb-3">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-4">Stock Level & Status</h3>
            <div className="flex flex-col gap-4">
              <InfoRow
                label="Minimum Stock Level"
                value={
                  isSteelItem ? (
                    <WeightDisplay
                      quantity={item.minStockLevel}
                      weightPerMeter={item.weightPerMeter}
                      lengthPerPiece={item.lengthPerPiece}
                      viewMode={viewMode}
                      unit={item.unit}
                    />
                  ) : (
                    `${item.minStockLevel} ${item.unit}`
                  )
                }
              />
              <InfoRow
                label="Status"
                value={
                  <span className={`px-2 py-1 rounded-full text-[12px] font-medium ${statusBadgeClass}`}>
                    {statusLabel}
                  </span>
                }
              />
              {/* Stock level progress bar */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[13px] text-slate-500">Stock Level</span>
                  <span className="text-[13px] text-slate-500">
                    {`${item.centralStoreQuantity ?? item.totalQuantity ?? 0} / ${item.minStockLevel} ${item.unit}`}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      stockStatus === 'low_stock'
                        ? 'bg-red-600'
                        : (item.centralStoreQuantity ?? item.totalQuantity ?? 0) <=
                          (item.minStockLevel ?? 0) * 1.5
                        ? 'bg-amber-500'
                        : 'bg-green-600'
                    }`}
                    style={{
                      width: (() => {
                        const qty = item.centralStoreQuantity ?? item.totalQuantity ?? 0;
                        const min = item.minStockLevel ?? 0;
                        const pct =
                          min === 0
                            ? qty > 0 ? 100 : 0
                            : Math.min((qty / (min * 2)) * 100, 100);
                        return `${pct}%`;
                      })(),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {isAdjustmentReady && (isAdminOrSuperAdmin || (isStoreIncharge && canStoreInchargeAdjust)) && (
          <div className="mb-3 bg-white rounded-[10px] p-4 border border-slate-200">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-3">Stock Actions</h3>
            {myAccessGrantedUntil && (
              <p className="text-[13px] text-slate-500 mb-3">
                Access expires at {formatAccessExpiry(myAccessGrantedUntil)}
              </p>
            )}
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setAdjustmentMode('add')}
                className="flex-1 min-w-[100px] bg-blue-800 rounded-[10px] min-h-[50px] flex items-center justify-center gap-2 px-2 text-white font-semibold"
              >
                <Icon name="plus-circle" className="w-5 h-5" />
                Add
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentMode('remove')}
                className="flex-1 min-w-[100px] border-2 border-red-600 rounded-[10px] min-h-[50px] flex items-center justify-center gap-2 px-2 bg-red-600/5 text-red-600 font-semibold"
              >
                <Icon name="trash" className="w-5 h-5" />
                Reduce
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentMode('set')}
                className="flex-1 min-w-[100px] border-2 border-blue-800 rounded-[10px] min-h-[50px] flex items-center justify-center gap-2 px-2 text-blue-800 font-semibold"
              >
                <Icon name="pencil-square" className="w-5 h-5" />
                Enter
              </button>
            </div>
            {canEditItem && (
              <button
                type="button"
                onClick={handleEdit}
                className="mt-4 w-full border-2 border-slate-200 rounded-[10px] min-h-[50px] flex items-center justify-center gap-2 text-slate-500 font-semibold"
              >
                <Icon name="pencil-square" className="w-5 h-5" />
                Edit Item
              </button>
            )}
          </div>
        )}

        {isAdjustmentReady && isStoreIncharge && !canStoreInchargeAdjust && (
          <div className="mb-3">
            <RequestAccessBanner onRequestAccess={() => setShowRequestAccessModal(true)} />
          </div>
        )}

        {canDeleteItem && (
          <div className="mb-6 mt-2 bg-white rounded-[10px] p-4 border border-red-600/30">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-2">Danger Zone</h3>
            <p className="text-[13px] text-slate-500 mb-4">
              Delete this item permanently. Historical POs and maintenance records will keep the item name for reference.
            </p>
            <button
              type="button"
              onClick={handleDeletePress}
              disabled={isCheckingDelete || isDeleting}
              className="w-full border border-red-600 rounded-[10px] h-[50px] flex items-center justify-center gap-2 bg-red-600/5 text-red-600 font-semibold disabled:opacity-70"
            >
              {isCheckingDelete || isDeleting ? (
                <LoadingSpinner />
              ) : (
                <Icon name="trash" className="w-5 h-5" />
              )}
              {isCheckingDelete ? 'Checking...' : isDeleting ? 'Deleting...' : 'Delete Item'}
            </button>
          </div>
        )}
      </div>

      <RequestInventoryAccessModal
        visible={showRequestAccessModal}
        onSubmit={handleRequestAccessSubmit}
        onCancel={() => setShowRequestAccessModal(false)}
        loading={isRequestingAccess}
      />

      {adjustmentMode && item && (
        <InventoryAdjustmentModal
          visible={!!adjustmentMode}
          mode={adjustmentMode}
          item={item}
          onSubmit={handleStockSubmit}
          onCancel={() => setAdjustmentMode(null)}
          loading={isSubmitting}
        />
      )}

      {confirmationModal}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className="text-[15px] text-slate-900">{value}</span>
    </div>
  );
}

function StockCard({
  iconName,
  label,
  item,
  quantity,
  viewMode,
}: {
  iconName: 'cube' | 'building-storefront' | 'map-pin' | 'wrench-screwdriver';
  label: string;
  item: Item;
  quantity: number;
  viewMode: 'pieces' | 'kg';
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
      <Icon name={iconName} className="w-8 h-8 text-blue-800 mb-2" />
      <WeightDisplay
        quantity={quantity}
        weightPerMeter={item.weightPerMeter}
        lengthPerPiece={item.lengthPerPiece}
        viewMode={viewMode}
        unit={item.unit}
        size="large"
      />
      <p className="text-[13px] text-slate-500 mt-1">{label}</p>
    </div>
  );
}

