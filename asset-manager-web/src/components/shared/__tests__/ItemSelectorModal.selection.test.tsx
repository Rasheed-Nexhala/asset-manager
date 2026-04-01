/**
 * Multi-select persists across search/pagination: selections are keyed by full Item,
 * not intersection with the current result page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    centralStoreQuantity: 10,
    atSitesQuantity: 0,
    inMaintenanceQuantity: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ItemSelectorModal — selection survives search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCount.mockResolvedValue(100);
  });

  it('includes items picked before search change when Add is pressed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const alpha = baseItem({ id: 'alpha', name: 'Alpha Bolt' });
    const beta = baseItem({ id: 'beta', name: 'Beta Nut' });

    mockListPaginated.mockImplementation(async (search?: string) => {
      if (!search || search === '') {
        return { items: [alpha], lastDoc: null };
      }
      if (search === 'beta') {
        return { items: [beta], lastDoc: null };
      }
      return { items: [], lastDoc: null };
    });

    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <ItemSelectorModal
        isOpen
        onClose={onClose}
        onSelect={onSelect}
        excludeItemIds={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha Bolt')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Alpha Bolt'));
    expect(screen.getByRole('button', { name: /Add \(1\)/ })).toBeInTheDocument();

    const searchInput = screen.getByRole('searchbox', { name: 'Search items' });
    await user.type(searchInput, 'beta');
    await vi.advanceTimersByTimeAsync(500);

    await waitFor(() => {
      expect(screen.getByText('Beta Nut')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Beta Nut'));

    await user.click(screen.getByRole('button', { name: /Add \(2\)/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const passed = onSelect.mock.calls[0][0] as Item[];
    expect(passed).toHaveLength(2);
    expect(passed.map((i) => i.id).sort()).toEqual(['alpha', 'beta']);

    vi.useRealTimers();
  });
});
