import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Transaction } from 'firebase/firestore';

vi.mock('../../../config/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user' } },
}));

vi.mock('../storageService', () => ({
  deleteItemImageByUrl: vi.fn(),
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    doc: vi.fn((...args: unknown[]) => {
      if (args.length === 1) {
        return { id: 'generated-id' };
      }
      const [, col, id] = args as [unknown, string, string];
      return { path: `${col}/${id}` };
    }),
  };
});

import { applyInventoryAdjustmentInTransaction } from '../inventoryService';

function makeTransaction(
  inventoryQty: number,
  itemData: Record<string, unknown>
): {
  tx: Transaction;
  updates: { ref: unknown; data: Record<string, unknown> }[];
} {
  const updates: { ref: unknown; data: Record<string, unknown> }[] = [];

  const tx = {
    get: vi.fn(async (ref: { path: string }) => {
      if (ref.path.startsWith('inventory/')) {
        return {
          exists: () => inventoryQty >= 0,
          data: () => (inventoryQty >= 0 ? { quantity: inventoryQty } : null),
        };
      }
      if (ref.path.startsWith('items/')) {
        return {
          exists: () => true,
          data: () => itemData,
        };
      }
      return { exists: () => false, data: () => null };
    }),
    update: vi.fn((ref, data) => {
      updates.push({ ref, data: data as Record<string, unknown> });
    }),
    set: vi.fn((ref, data) => {
      updates.push({ ref, data: data as Record<string, unknown> });
    }),
    delete: vi.fn((ref) => {
      updates.push({ ref, data: { _op: 'delete' } });
    }),
  };

  return { tx: tx as unknown as Transaction, updates };
}

describe('applyInventoryAdjustmentInTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseItem = {
    name: 'Fuel',
    sku: 'FUEL-1',
    totalQuantity: 1000,
    centralStoreQuantity: 500,
    atSitesQuantity: 400,
    inMaintenanceQuantity: 100,
  };

  it('removes stock at store: lowers inventory quantity and centralStoreQuantity', async () => {
    const { tx, updates } = makeTransaction(100, { ...baseItem });

    const result = await applyInventoryAdjustmentInTransaction(tx, {
      itemId: 'item-1',
      itemName: 'Fuel',
      itemSku: 'FUEL-1',
      locationId: 'loc-store',
      locationType: 'store',
      locationName: 'Central Store',
      type: 'remove',
      quantity: 25,
      reason: 'test',
      notes: 'n',
    });

    expect(result).toEqual({ oldQuantity: 100, newQuantity: 75 });

    const itemUpdate = updates.find(
      (u) => (u.data as { centralStoreQuantity?: number }).centralStoreQuantity === 475
    );
    expect(itemUpdate).toBeDefined();
    expect((itemUpdate?.data as { totalQuantity?: number }).totalQuantity).toBe(975);
  });

  it('throws when item document does not exist', async () => {
    const tx = {
      get: vi.fn(async (ref: { path: string }) => {
        if (ref.path.startsWith('inventory/')) {
          return { exists: () => true, data: () => ({ quantity: 10 }) };
        }
        return { exists: () => false, data: () => null };
      }),
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as Transaction;

    await expect(
      applyInventoryAdjustmentInTransaction(tx, {
        itemId: 'missing',
        itemName: 'x',
        itemSku: 'x',
        locationId: 'loc',
        locationType: 'store',
        locationName: 'Central Store',
        type: 'remove',
        quantity: 1,
        reason: 'r',
        notes: 'n',
      })
    ).rejects.toThrow('Item missing not found');
  });

  it('throws when remove would make location quantity negative', async () => {
    const { tx } = makeTransaction(5, { ...baseItem });

    await expect(
      applyInventoryAdjustmentInTransaction(tx, {
        itemId: 'item-1',
        itemName: 'Fuel',
        itemSku: 'FUEL-1',
        locationId: 'loc-store',
        locationType: 'store',
        locationName: 'Central Store',
        type: 'remove',
        quantity: 10,
        reason: 'test',
        notes: 'n',
      })
    ).rejects.toThrow('Cannot reduce stock below zero');
  });
});
