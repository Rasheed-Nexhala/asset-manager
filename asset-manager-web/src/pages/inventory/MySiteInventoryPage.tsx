import { useState, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUserId } from '../../store/selectors/authSelectors';
import { selectAllSites, selectSitesLoading } from '../../store/selectors/sitesSelectors';
import {
  selectAllItems,
  selectInventoryByLocation,
  selectItemsLoading,
} from '../../store/selectors/inventorySelectors';
import { setInventoryForLocation } from '../../store/slices/inventorySlice';
import { fetchSites, setSites } from '../../store/slices/sitesSlice';
import { subscribeToSites } from '../../services/firebase/siteService';
import {
  subscribeInventoryByLocation,
  getInventoryByLocation,
} from '../../services/firebase/inventoryService';
import { getLocationId } from '../../utils/locationUtils';
import { runNonCriticalTask } from '../../utils/nonCriticalTask';
import type { InventoryEntry, ItemType } from '../../types/inventory';
import type { Site } from '../../types/sites';
import { InventorySubNav } from '../../components/inventory';
import { InventoryListItem } from '../../components/inventory/InventoryListItem';
import { Icon } from '../../components/shared/Icon';
import { InventoryLoadingState } from '../../components/shared/InventoryLoadingState';

export function MySiteInventoryPage() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const sites = useAppSelector(selectAllSites);
  const items = useAppSelector(selectAllItems);
  const isLoading = useAppSelector(selectItemsLoading);
  const sitesLoading = useAppSelector(selectSitesLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [isLoadingSite, setIsLoadingSite] = useState(true);

  useEffect(() => {
    dispatch(fetchSites());
    const unsubscribe = subscribeToSites((updatedSites: Site[]) => {
      dispatch(setSites(updatedSites));
    });
    return () => unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    const safeSites = Array.isArray(sites) ? sites : [];
    if (userId && safeSites.length > 0) {
      const userSite = safeSites.find((s) => s.managerId === userId);
      setCurrentSite(userSite ?? null);
      setIsLoadingSite(false);
    } else if (!sitesLoading && safeSites.length === 0) {
      setIsLoadingSite(false);
    }
  }, [userId, sites, sitesLoading]);

  const siteId = currentSite?.id ?? null;
  useEffect(() => {
    if (!siteId) return;
    const locationId = getLocationId('site', siteId);
    const unsubscribe = subscribeInventoryByLocation(locationId, (inventory) => {
      dispatch(setInventoryForLocation({ locationId, inventory }));
    });
    return () => unsubscribe();
  }, [siteId, dispatch]);

  useEffect(() => {
    if (!siteId) return;
    const locationId = getLocationId('site', siteId);
    runNonCriticalTask('my_site_inventory_focus_refresh', () => getInventoryByLocation(locationId), {
      feature: 'inventory',
      tags: { screen: 'my_site_inventory' },
    })
      .then((inventory) => {
        if (inventory) dispatch(setInventoryForLocation({ locationId, inventory }));
      })
      .catch(() => {});
  }, [siteId, dispatch]);

  const siteLocationId = currentSite ? getLocationId('site', currentSite.id) : '';
  const inventoryEntries = useAppSelector(selectInventoryByLocation(siteLocationId));

  const enrichedInventory = useMemo(() => {
    const uniqueEntriesMap = new Map<string, InventoryEntry>();
    inventoryEntries.forEach((entry) => {
      if (!uniqueEntriesMap.has(entry.id)) uniqueEntriesMap.set(entry.id, entry);
    });
    return Array.from(uniqueEntriesMap.values())
      .filter((entry) => entry.quantity > 0)
      .map((entry) => {
        const item = items.find((i) => i.id === entry.itemId);
        return {
          entry,
          item,
          type: (item?.type || 'consumable') as ItemType,
          unit: item?.unit || 'piece',
          imageUrl: item?.imageUrl,
        };
      });
  }, [inventoryEntries, items]);

  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return enrichedInventory;
    const query = searchQuery.toLowerCase().trim();
    return enrichedInventory.filter(({ entry }) => {
      const itemName = (entry?.itemName ?? '').toLowerCase();
      const itemSku = (entry?.itemSku ?? '').toLowerCase();
      return itemName.includes(query) || itemSku.includes(query);
    });
  }, [enrichedInventory, searchQuery]);

  if (isLoadingSite || sitesLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <InventorySubNav />
        <InventoryLoadingState message="Loading site information..." />
      </div>
    );
  }

  if (!currentSite) {
    return (
      <div className="flex flex-col h-full">
        <InventorySubNav />
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="building-office-2" className="w-16 h-16 text-slate-400" />
          <h2 className="text-[22px] font-semibold text-slate-900 text-center mb-2 mt-4">
            No Site Assigned
          </h2>
          <p className="text-[15px] text-slate-500 text-center">
            You haven&apos;t been assigned to a site yet. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <InventorySubNav />
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-3">
          <div className="bg-slate-100 rounded-full h-12 px-4 flex items-center gap-3">
            <Icon name="magnifying-glass" className="w-5 h-5 text-slate-400" />
            <input
              type="search"
              placeholder="Search items by name or SKU..."
              className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search inventory items"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-8 h-8 flex items-center justify-center"
                aria-label="Clear search"
              >
                <Icon name="x-mark" className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pb-6">
          {isLoading ? (
            <InventoryLoadingState message="Loading inventory..." fullHeight={false} />
          ) : filteredInventory.length === 0 ? (
            <div className="py-12 flex flex-col items-center">
              <Icon name="cube" className="w-16 h-16 text-slate-400" />
              <h2 className="text-[22px] font-semibold text-slate-900 text-center mb-2 mt-4">
                {searchQuery ? 'No Items Found' : 'No Inventory Items'}
              </h2>
              <p className="text-[15px] text-slate-500 text-center">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Your site inventory will appear here once items are added'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredInventory.map(({ entry, item, type, unit, imageUrl }) => (
                <InventoryListItem
                  key={entry.id}
                  entry={entry}
                  type={type}
                  unit={unit}
                  imageUrl={imageUrl}
                  weightPerMeter={item?.weightPerMeter}
                  lengthPerPiece={item?.lengthPerPiece ?? entry.lengthPerPiece}
                />
              ))}
            </div>
          )}

          {/* Desktop table */}
          {!isLoading && filteredInventory.length > 0 && (
            <div className="hidden md:block bg-white rounded-[10px] border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-[13px] font-semibold text-slate-900">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map(({ entry, item, type, unit }) => {
                    const typeDetails = { consumable: 'Consumable', non_consumable: 'Non-Consumable', fuel: 'Fuel' }[type];
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-100 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <td className="px-4 py-3">
                          <a
                            href={`/inventory/${entry.itemId}`}
                            className="text-[15px] font-semibold text-blue-800 hover:underline"
                          >
                            {entry.itemName}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-[15px] text-slate-700">{entry.itemSku}</td>
                        <td className="px-4 py-3 text-[15px] text-slate-700">
                          {item?.categoryName || 'Uncategorized'}
                        </td>
                        <td className="px-4 py-3 text-[15px] text-slate-700">{unit}</td>
                        <td className="px-4 py-3 text-[15px] text-slate-700">{typeDetails}</td>
                        <td className="px-4 py-3 text-right text-[15px] font-medium text-slate-900">
                          {entry.quantity} {unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
