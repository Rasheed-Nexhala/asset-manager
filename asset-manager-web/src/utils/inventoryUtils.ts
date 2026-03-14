/**
 * Inventory utility functions
 */

/**
 * Item-like shape with quantity fields for low-stock check
 */
export interface LowStockCheckable {
  totalQuantity?: number;
  centralStoreQuantity?: number;
  minStockLevel?: number;
}

import type { ItemType } from '../types/inventory';

/**
 * Returns formatted label and UI color details for a given item type.
 */
export function getItemTypeDetails(type: ItemType | string | undefined): { label: string, color: string, bgClass: string, textClass: string } {
  switch (type) {
    case 'non_consumable':
      return { label: 'Non-Consumable', color: '#0D9488', bgClass: 'bg-[#0D9488]/15', textClass: 'text-[#0D9488]' };
    case 'fuel':
      return { label: 'Fuel', color: '#B45309', bgClass: 'bg-[#B45309]/15', textClass: 'text-[#B45309]' };
    case 'consumable':
    default:
      return { label: 'Consumable', color: '#475569', bgClass: 'bg-[#475569]/15', textClass: 'text-[#475569]' };
  }
}

/**
 * Determines if an item is in low stock at the central store.
 * Low stock = centralStoreQuantity <= minStockLevel
 *
 * Uses centralStoreQuantity (warehouse stock) because that is the reorder trigger:
 * when the central store runs low, we need to reorder. Items at sites are
 * already allocated and not available for redistribution.
 *
 * Example: 46 total (18 at store, 28 at sites), min 20 → low stock (18 <= 20)
 *
 * Uses nullish coalescing for defensive handling of undefined values.
 *
 * @param item - Item with centralStoreQuantity and minStockLevel (or null)
 * @returns true if central store is low stock (qty <= min), false otherwise
 */
export function isLowStock(item: LowStockCheckable | null): boolean {
  if (!item) return false;
  const qty = item.centralStoreQuantity ?? item.totalQuantity ?? 0;
  const min = item.minStockLevel ?? 0;
  return qty <= min;
}
