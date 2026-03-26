import { describe, it, expect } from 'vitest';

/**
 * Documents the product rule implemented in inventoryService.updateItem:
 * type may change only when no stock at sites and none in maintenance.
 */
function typeChangeBlocked(atSitesQuantity: number, inMaintenanceQuantity: number): boolean {
  return atSitesQuantity > 0 || inMaintenanceQuantity > 0;
}

describe('editableItemMetadataRules', () => {
  it('allows type change when all stock is central-only (no site or maintenance stock)', () => {
    expect(typeChangeBlocked(0, 0)).toBe(false);
  });

  it('blocks type change when any stock is at sites', () => {
    expect(typeChangeBlocked(1, 0)).toBe(true);
  });

  it('blocks type change when any stock is in maintenance', () => {
    expect(typeChangeBlocked(0, 3)).toBe(true);
  });
});
