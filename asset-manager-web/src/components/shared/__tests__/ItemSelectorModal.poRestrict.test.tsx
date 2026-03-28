/**
 * PO item picker: client-side low-stock filter when restrictToLowStock is true (ItemSelectorModal L47–49).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ItemSelectorModal } from '../ItemSelectorModal';
import type { Item } from '../../../types/inventory';

const { mockListPaginated, mockGetCount } = vi.hoisted(() => ({
  mockListPaginated: vi.fn(),
  mockGetCount: vi.fn(),
}));

vi.mock('../../../services/firebase/inventoryService', () => ({
  listItemsForSelectionPaginated: (...args: unknown[]) => mockListPaginated(...args),
  getItemsForSelectionCount: (...args: unknown[]) => mockGetCount(...args),
  SELECTION_ITEMS_PAGE_SIZE: 15,
}));

function baseItem(overrides: Partial<Item>): Item {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 'item-1',
    name: 'Item One',
    sku: 'SKU-1',
    type: 'consumable',
    unit: 'pcs',
    minStockLevel: 20,
    status: 'active',
    totalQuantity: 0,
    centralStoreQuantity: 0,
    atSitesQuantity: 0,
    inMaintenanceQuantity: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** Low stock: central qty <= min (see inventoryUtils.isLowStock). */
const lowStockItem = baseItem({
  id: 'low-1',
  name: 'Low Stock Alpha',
  sku: 'LOW-A',
  centralStoreQuantity: 5,
  minStockLevel: 20,
});

const notLowStockItem = baseItem({
  id: 'ok-1',
  name: 'Well Stocked Beta',
  sku: 'OK-B',
  centralStoreQuantity: 100,
  minStockLevel: 20,
});

describe('ItemSelectorModal — restrictToLowStock (PO)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPaginated.mockResolvedValue({
      items: [lowStockItem, notLowStockItem],
      lastDoc: null,
    });
    mockGetCount.mockResolvedValue(2);
  });

  it('when restrictToLowStock is true, only low-stock rows are listed (filter is client-side)', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <ItemSelectorModal
        isOpen
        onClose={onClose}
        onSelect={onSelect}
        restrictToLowStock
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading items…')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Low Stock Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Well Stocked Beta')).not.toBeInTheDocument();
  });

  it('when restrictToLowStock is false, all items from the service appear', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <ItemSelectorModal
        isOpen
        onClose={onClose}
        onSelect={onSelect}
        restrictToLowStock={false}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading items…')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Low Stock Alpha')).toBeInTheDocument();
    expect(screen.getByText('Well Stocked Beta')).toBeInTheDocument();
  });
});
