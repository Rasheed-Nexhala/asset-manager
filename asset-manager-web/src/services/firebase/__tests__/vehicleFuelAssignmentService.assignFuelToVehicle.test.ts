import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTransaction = {
  set: vi.fn(),
};

vi.mock('../../../config/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1' } },
}));

vi.mock('../activityLogService', () => ({
  logVehicleFuelAssignedToCloud: vi.fn(),
}));

vi.mock('../inventoryService', () => ({
  getItemById: vi.fn(),
  applyInventoryAdjustmentInTransaction: vi.fn().mockResolvedValue({
    oldQuantity: 100,
    newQuantity: 90,
  }),
}));

vi.mock('../vehicleService', () => ({
  getVehicleById: vi.fn(),
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    runTransaction: vi.fn((_db, fn: (tx: typeof mockTransaction) => Promise<unknown>) =>
      fn(mockTransaction)
    ),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ name: 'Ref site' }),
    }),
    doc: vi.fn((...args: unknown[]) => {
      if (args.length === 1) {
        return { id: 'assignment-new-id' };
      }
      return { path: `sites/${args[2]}` };
    }),
    collection: vi.fn(() => ({})),
  };
});

import { getItemById, applyInventoryAdjustmentInTransaction } from '../inventoryService';
import { getVehicleById } from '../vehicleService';
import { logVehicleFuelAssignedToCloud } from '../activityLogService';
import { assignFuelToVehicle } from '../vehicleFuelAssignmentService';

const mockGetItemById = vi.mocked(getItemById);
const mockGetVehicleById = vi.mocked(getVehicleById);
const mockApplyInv = vi.mocked(applyInventoryAdjustmentInTransaction);
const mockLog = vi.mocked(logVehicleFuelAssignedToCloud);

describe('assignFuelToVehicle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetItemById.mockResolvedValue({
      id: 'fuel-1',
      name: 'Diesel',
      sku: 'DSL',
      type: 'fuel',
    } as Awaited<ReturnType<typeof getItemById>>);
    mockGetVehicleById.mockResolvedValue({
      id: 'veh-1',
      vehicleNumber: 'KA-01-AB-1234',
    } as Awaited<ReturnType<typeof getVehicleById>>);
  });

  it('runs one transaction: applies inventory adjustment then writes assignment doc', async () => {
    const result = await assignFuelToVehicle(
      {
        itemId: 'fuel-1',
        vehicleId: 'veh-1',
        quantityLiters: 10,
        reason: 'Site delivery',
        notes: '',
        referenceSiteId: null,
      },
      'Store User',
      'Store Incharge'
    );

    expect(result).toEqual({ assignmentId: 'assignment-new-id' });

    expect(mockApplyInv).toHaveBeenCalledTimes(1);
    expect(mockApplyInv).toHaveBeenCalledWith(
      mockTransaction,
      expect.objectContaining({
        itemId: 'fuel-1',
        type: 'remove',
        quantity: 10,
        reason: 'Vehicle fuel assignment',
      })
    );

    expect(mockTransaction.set).toHaveBeenCalledTimes(1);
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'assignment-new-id' }),
      expect.objectContaining({
        vehicleId: 'veh-1',
        vehicleNumber: 'KA-01-AB-1234',
        itemId: 'fuel-1',
        quantityLiters: 10,
        assignedByUserId: 'user-1',
        assignedByName: 'Store User',
      })
    );

    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: 'assignment-new-id',
        quantityLiters: 10,
        oldCentralQuantity: 100,
        newCentralQuantity: 90,
      })
    );
  });

  it('rejects non-fuel items', async () => {
    mockGetItemById.mockResolvedValueOnce({
      id: 'steel-1',
      name: 'Steel',
      sku: 'ST',
      type: 'non_consumable',
    } as Awaited<ReturnType<typeof getItemById>>);

    await expect(
      assignFuelToVehicle(
        {
          itemId: 'steel-1',
          vehicleId: 'veh-1',
          quantityLiters: 1,
          reason: 'x',
          notes: '',
          referenceSiteId: null,
        },
        'U',
        'Store Incharge'
      )
    ).rejects.toThrow('Only fuel-type inventory items');

    expect(mockApplyInv).not.toHaveBeenCalled();
  });
});
