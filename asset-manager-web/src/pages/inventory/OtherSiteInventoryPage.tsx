import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchInventoryByLocation } from '../../store/thunks/inventoryThunks';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import {
  selectInventoryByLocation,
  selectItemsLoading,
  selectItemsError,
  selectAllItems,
} from '../../store/selectors/inventorySelectors';
import { selectAllSites, selectAssignedSiteIdForUser } from '../../store/selectors/sitesSelectors';
import { selectUserId, selectIsSiteManager } from '../../store/selectors/authSelectors';
import { clearError } from '../../store/slices/inventorySlice';
import { fetchSites, setSites } from '../../store/slices/sitesSlice';
import { subscribeToSites } from '../../services/firebase/siteService';
import { getSite } from '../../services/firebase/siteService';
import { getLocationId } from '../../utils/locationUtils';
import type { Site } from '../../types/sites';
import type { InventoryEntry, Item } from '../../types/inventory';
import { InventorySubNav } from '../../components/inventory';
import { InventoryListItem } from '../../components/inventory/InventoryListItem';
import { Icon } from '../../components/shared/Icon';
import { InventoryLoadingState } from '../../components/shared/InventoryLoadingState';

export function OtherSiteInventoryPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [site, setSite] = useState<Site | null>(null);
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteError, setSiteError] = useState<string | null>(null);

  const locationId = siteId ? getLocationId('site', siteId) : '';
  const inventoryEntries = useAppSelector(selectInventoryByLocation(locationId));
  const allItems = useAppSelector(selectAllItems);
  const isLoading = useAppSelector(selectItemsLoading);
  const error = useAppSelector(selectItemsError);

  const userId = useAppSelector(selectUserId);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const sites = useAppSelector(selectAllSites);
  const myAssignedSiteId = useAppSelector(selectAssignedSiteIdForUser(userId));
  const myAssignedSite = useMemo(
    () => sites.find((s) => s.id === myAssignedSiteId) ?? null,
    [sites, myAssignedSiteId]
  );

  useEffect(() => {
    if (sites.length === 0) {
      dispatch(fetchSites());
      const unsub = subscribeToSites((updated: Site[]) => dispatch(setSites(updated)));
      return () => unsub();
    }
  }, [dispatch, sites.length]);

  useEffect(() => {
    const load = async () => {
      if (!siteId) {
        setSiteLoading(false);
        setSiteError('Site ID is required');
        return;
      }
      try {
        setSiteLoading(true);
        setSiteError(null);
        const data = await getSite(siteId);
        setSite(data ?? null);
        if (!data) setSiteError('Site not found');
      } catch (err: unknown) {
        setSiteError(err instanceof Error ? err.message : 'Failed to load site');
      } finally {
        setSiteLoading(false);
      }
    };
    load();
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    dispatch(fetchInventoryByLocation(getLocationId('site', siteId)));
  }, [dispatch, siteId]);

  useEffect(() => {
    if (allItems.length === 0) dispatch(fetchItems(undefined));
  }, [dispatch, allItems.length]);

  const inventoryWithItems = useMemo(() => {
    const unique = new Map<string, InventoryEntry>();
    inventoryEntries.forEach((e) => {
      if (!unique.has(e.id)) unique.set(e.id, e);
    });
    return Array.from(unique.values())
      .map((entry) => {
        const item = allItems.find((i) => i.id === entry.itemId);
        if (!item) return null;
        return { entry, item };
      })
      .filter((x): x is { entry: InventoryEntry; item: Item } => x !== null);
  }, [inventoryEntries, allItems]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleRequestTransfer = useCallback(
    (entry: InventoryEntry, item: Item) => {
      if (!myAssignedSiteId || !myAssignedSite) {
        window.alert('You need to be assigned to a site before requesting a transfer.');
        return;
      }
      if (entry.quantity <= 0) {
        window.alert(
          `There is no available stock of "${entry.itemName}" at ${site?.name ?? 'this site'}.`
        );
        return;
      }
      navigate('/requests/transfer/new', {
        state: {
          sourceSiteId: siteId,
          sourceSiteName: site?.name ?? 'Other Site',
          destinationSiteId: myAssignedSiteId,
          destinationSiteName: myAssignedSite.name,
          preselectedItem: {
            itemId: entry.itemId,
            itemName: entry.itemName,
            itemSku: entry.itemSku,
            unit: item.unit,
            itemType: item.type === 'fuel' ? 'consumable' : item.type,
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            imageUrl: item.imageUrl,
            availableQty: entry.quantity,
            weightPerMeter: item.weightPerMeter,
            lengthPerPiece: item.lengthPerPiece ?? entry.lengthPerPiece,
          },
        },
      });
    },
    [siteId, site, myAssignedSiteId, myAssignedSite, navigate]
  );

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  if (siteLoading || isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <InventorySubNav />
        <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
          <button
            type="button"
            onClick={handleBack}
            className="w-12 h-12 flex items-center justify-center -ml-2"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="w-6 h-6 text-slate-900" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900 flex-1">
            {site?.name ? `${site.name} Inventory` : 'Site Inventory'}
          </h1>
        </header>
        <InventoryLoadingState message="Loading site inventory..." />
      </div>
    );
  }

  if (siteError || error) {
    return (
      <div className="flex flex-col h-full">
        <InventorySubNav />
        <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
          <button
            type="button"
            onClick={handleBack}
            className="w-12 h-12 flex items-center justify-center -ml-2"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="w-6 h-6 text-slate-900" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900 flex-1">
            {site?.name || 'Site'} Inventory
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="exclamation-circle" className="w-12 h-12 text-red-600" />
          <h2 className="text-[22px] font-semibold text-slate-900 mt-4 mb-2 text-center">
            Error Loading Data
          </h2>
          <p className="text-[15px] text-slate-500 text-center">
            {siteError || error || 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  const siteName = site?.name || 'Site';

  return (
    <div className="flex flex-col h-full">
      <InventorySubNav />
      <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
        <button
          type="button"
          onClick={handleBack}
          className="w-12 h-12 flex items-center justify-center -ml-2"
          aria-label="Go back"
        >
          <Icon name="arrow-left" className="w-6 h-6 text-slate-900" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900 flex-1">{siteName} Inventory</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isSiteManager && myAssignedSiteId ? (
          <div className="bg-indigo-500/10 px-4 py-3 mx-4 mt-4 rounded-[10px] border border-indigo-500/20">
            <div className="flex items-start gap-3">
              <Icon name="arrows-right-left" className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-indigo-600">
                Click &quot;Request Transfer&quot; on any item to move it from this site to{' '}
                {myAssignedSite?.name ?? 'your site'}.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-500/15 px-4 py-3 mx-4 mt-4 rounded-[10px] border border-blue-500/30">
            <div className="flex items-start gap-3">
              <Icon name="cube" className="w-5 h-5 text-blue-800 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-blue-800">
                Need these items? Contact Store Incharge to coordinate transfer.
              </p>
            </div>
          </div>
        )}

        {(site?.managerName || site?.contactNumber) && (
          <div className="px-4 mt-4">
            <div className="bg-white rounded-[10px] p-4 border border-slate-200">
              <h3 className="text-[17px] font-semibold text-slate-900 mb-3">Site Information</h3>
              {site.managerName && (
                <div className="mb-3">
                  <p className="text-[13px] text-slate-500 mb-1">Site Manager</p>
                  <p className="text-[15px] text-slate-900">{site.managerName}</p>
                </div>
              )}
              {site.contactNumber && (
                <div>
                  <p className="text-[13px] text-slate-500 mb-1">Contact Number</p>
                  <p className="text-[15px] text-slate-900">{site.contactNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-4 mt-4 pb-6">
          {inventoryWithItems.length === 0 ? (
            <div className="bg-white rounded-[10px] p-8 flex flex-col items-center border border-slate-200">
              <Icon name="cube" className="w-12 h-12 text-slate-400" />
              <h2 className="text-[22px] font-semibold text-slate-900 mt-4 mb-2 text-center">
                No Inventory Items
              </h2>
              <p className="text-[15px] text-slate-500 text-center">
                This site currently has no inventory items.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {inventoryWithItems.map(({ entry, item }) => (
                <InventoryListItem
                  key={entry.id}
                  entry={entry}
                  imageUrl={item.imageUrl}
                  type={item.type}
                  unit={item.unit}
                  weightPerMeter={item.weightPerMeter}
                  lengthPerPiece={item.lengthPerPiece ?? entry.lengthPerPiece}
                  onRequestTransfer={
                    isSiteManager && myAssignedSiteId && myAssignedSiteId !== siteId
                      ? () => handleRequestTransfer(entry, item)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
