/**
 * Unit utilities for inventory and quantity handling.
 * Used across AddToMaintenance, Requests, Purchase Orders, Inventory adjustments.
 */

/**
 * Discrete units require whole-number quantities (no decimals).
 * Examples: Pieces, Bags, Sets, Boxes, Rolls
 */
const DISCRETE_UNITS = ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'] as const;

/**
 * Check if a unit requires whole-number quantities.
 * Used for validation when user enters quantity in pieces/bags/sets etc.
 */
export function isDiscreteUnit(unit: string): boolean {
  return DISCRETE_UNITS.some((u) => u.toLowerCase() === (unit || '').toLowerCase());
}

/**
 * Common units available for items (matches UnitSelector COMMON_UNITS)
 */
export const COMMON_UNITS = [
  'Nos',
  'Pcs',
  'Bag',
  'Box',
  'Set',
  'Pair',
  'Roll',
  'Kg',
  'Ton (MT)',
  'Meter',
  'Liters',
] as const;

/**
 * Steel master restricted units
 */
export const STEEL_MASTER_UNITS = ['Pcs', 'Kg', 'Ton (MT)'] as const;

/**
 * Normalize unit for comparison (handles Pcs vs Pieces, etc.)
 */
export function normalizeUnitForDisplay(unit: string): string {
  const normalized = unit?.trim() || '';
  if (normalized.toLowerCase() === 'pcs' || normalized.toLowerCase() === 'pieces') {
    return 'Pcs';
  }
  return normalized || 'units';
}
