import { describe, it, expect } from 'vitest';
import { getItemTypeDetails, isLowStock } from '../inventoryUtils';

describe('inventoryUtils', () => {
  describe('isLowStock', () => {
    it('returns true when quantity is less than minStockLevel', () => {
      expect(isLowStock({ totalQuantity: 2, minStockLevel: 5 })).toBe(true);
      expect(isLowStock({ totalQuantity: 0, minStockLevel: 10 })).toBe(true);
    });

    it('returns true when quantity equals minStockLevel', () => {
      expect(isLowStock({ totalQuantity: 5, minStockLevel: 5 })).toBe(true);
      expect(isLowStock({ totalQuantity: 10, minStockLevel: 10 })).toBe(true);
    });

    it('returns false when quantity is greater than minStockLevel', () => {
      expect(isLowStock({ totalQuantity: 10, minStockLevel: 5 })).toBe(false);
      expect(isLowStock({ totalQuantity: 6, minStockLevel: 5 })).toBe(false);
    });

    it('handles undefined totalQuantity (treats as 0)', () => {
      expect(isLowStock({ totalQuantity: undefined, minStockLevel: 5 })).toBe(true);
      expect(isLowStock({ totalQuantity: undefined, minStockLevel: 0 })).toBe(true);
    });

    it('handles undefined minStockLevel (treats as 0)', () => {
      expect(isLowStock({ totalQuantity: 0, minStockLevel: undefined })).toBe(true);
      expect(isLowStock({ totalQuantity: 5, minStockLevel: undefined })).toBe(false);
    });

    it('returns false for null item', () => {
      expect(isLowStock(null)).toBe(false);
    });

    it('handles minStockLevel of 0', () => {
      expect(isLowStock({ totalQuantity: 0, minStockLevel: 0 })).toBe(true);
      expect(isLowStock({ totalQuantity: 1, minStockLevel: 0 })).toBe(false);
    });

    it('uses centralStoreQuantity when available (reorder trigger)', () => {
      // 46 total, 18 at central store, 28 at sites, min 20 → low stock (18 <= 20)
      expect(
        isLowStock({
          totalQuantity: 46,
          centralStoreQuantity: 18,
          minStockLevel: 20,
        })
      ).toBe(true);
      // 46 total, 25 at central store, min 20 → not low stock (25 > 20)
      expect(
        isLowStock({
          totalQuantity: 46,
          centralStoreQuantity: 25,
          minStockLevel: 20,
        })
      ).toBe(false);
    });
  });

  describe('getItemTypeDetails', () => {
    it('returns labels for known types', () => {
      expect(getItemTypeDetails('non_consumable').label).toBe('Non-Consumable');
      expect(getItemTypeDetails('fuel').label).toBe('Fuel');
      expect(getItemTypeDetails('consumable').label).toBe('Consumable');
    });

    it('defaults consumable styling for unknown types', () => {
      const d = getItemTypeDetails(undefined);
      expect(d.label).toBe('Consumable');
      expect(d.bgClass).toContain('475569');
    });
  });
});
