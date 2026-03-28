/**
 * Unit/component tests for ItemForm custom items unit conversion logic.
 * Covers: weightConfig, handleUnitChange, live validation, handleSubmit Kg→pieces conversion.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
  analytics: null,
}));

vi.mock('../../../services/firebase/categoryService', () => ({
  subscribeCategories: vi.fn(() => () => {}),
  listCategories: vi.fn(() => Promise.resolve([])),
}));
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import { ItemForm } from '../ItemForm';
import type { SteelMaster } from '../../../types/steelMaster';
import type { RootState } from '../../../store';

// Steel master: 5 kg/m × 6m = 30 kg per piece. 100 kg = 3.33... pieces (inexact). 30 kg = 1 piece (exact).
const STEEL_MASTER_5x6: SteelMaster = {
  id: 'sm-1',
  name: 'Steel Beam 5kg',
  weightPerMeter: 5,
  defaultLength: 6,
  hsnCode: 'HSN001',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// 2 kg/m × 6m = 12 kg per piece. 100 kg = 8.33... pieces (inexact). 120 kg = 10 pieces (exact).
const STEEL_MASTER_2x6: SteelMaster = {
  id: 'sm-2',
  name: 'Steel Bar 2kg',
  weightPerMeter: 2,
  defaultLength: 6,
  hsnCode: 'HSN002',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const preloadedState: Partial<RootState> = {
  steelMaster: {
    steelMasters: [STEEL_MASTER_5x6, STEEL_MASTER_2x6],
    selectedSteelMaster: null,
    loading: false,
    error: null,
  },
  auth: {
    user: { uid: 'u1', email: 'test@test.com' },
    userRole: { role: 'Admin' },
    loading: false,
    error: null,
  },
  inventory: {
    categories: [],
    items: [],
    filters: null,
    loading: false,
    error: null,
    totalCount: 0,
    lastDoc: null,
    inventoryByLocation: {},
    itemsLoading: false,
  },
} as Partial<RootState>;

// No mock for fetchSteelMasters - preloadedState provides steel masters, so useEffect won't fetch

async function selectCustomItem(user: ReturnType<typeof userEvent.setup>, masterName: string) {
  const selectBtn = screen.getByRole('button', { name: /select custom item/i });
  await user.click(selectBtn);
  // Modal wrapper has aria-hidden so dialog is not in a11y tree; use getByText
  const masterText = await screen.findByText(new RegExp(masterName, 'i'));
  const itemBtn = masterText.closest('button');
  if (!itemBtn) throw new Error(`Could not find button for ${masterName}`);
  await user.click(itemBtn);
}

describe('ItemForm - Custom items unit conversion', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without errors in create mode', () => {
    renderWithProviders(
      <ItemForm mode="create" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      { preloadedState }
    );
    expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sku/i)).toBeInTheDocument();
  });

  it('when custom item selected and unit is Kg: entering 100 kg that does not convert to exact pieces shows conversion error', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ItemForm mode="create" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      { preloadedState }
    );

    await selectCustomItem(user, 'Steel Beam 5kg');
    // 5 kg/m × 6m = 30 kg per piece. 100 kg = 3.33... pieces (inexact)
    const unitSelect = screen.getByLabelText(/unit/i);
    await user.selectOptions(unitSelect, 'Kg');

    const initialQtyInput = screen.getByLabelText(/initial quantity/i);
    await user.clear(initialQtyInput);
    await user.type(initialQtyInput, '100');

    // Live validation should show conversion error
    expect(screen.getByText(/cannot convert.*100.*kg/i)).toBeInTheDocument();
    expect(screen.getByText(/weight per piece/i)).toBeInTheDocument();
  });

  it('when custom item selected: entering exact kg (30 kg for 1 piece at 5 kg/m × 6m) passes validation', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ItemForm mode="create" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      { preloadedState }
    );

    await selectCustomItem(user, 'Steel Beam 5kg');
    const unitSelect = screen.getByLabelText(/unit/i);
    await user.selectOptions(unitSelect, 'Kg');

    await user.type(screen.getByLabelText(/item name/i), 'Test Item');
    await user.type(screen.getByLabelText(/sku/i), 'SKU-001');
    await user.type(screen.getByLabelText(/minimum stock level/i), '0');
    await user.type(screen.getByLabelText(/initial quantity/i), '30');

    const createBtn = screen.getByRole('button', { name: /create/i });
    await user.click(createBtn);

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const submitted = mockOnSubmit.mock.calls[0][0];
    expect(submitted.initialQuantity).toBe(1);
    expect(submitted.unit).toBe('Pcs');
  });

  it('handleUnitChange: switching from Pcs (e.g. 10) to Kg converts and displays correct kg value', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ItemForm mode="create" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      { preloadedState }
    );

    await selectCustomItem(user, 'Steel Bar 2kg');
    // 2 kg/m × 6m = 12 kg per piece. Start with 10 pieces.
    await user.type(screen.getByLabelText(/initial quantity/i), '10');
    await user.type(screen.getByLabelText(/minimum stock level/i), '5');

    const unitSelect = screen.getByLabelText(/unit/i);
    await user.selectOptions(unitSelect, 'Kg');

    // 10 pieces × 12 kg/piece = 120 kg
    expect(screen.getByLabelText(/initial quantity/i)).toHaveValue(120);
    // 5 pieces × 12 kg/piece = 60 kg
    expect(screen.getByLabelText(/minimum stock level/i)).toHaveValue(60);
  });

  it('handleUnitChange: switching from Kg back to Pcs converts back', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ItemForm mode="create" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      { preloadedState }
    );

    await selectCustomItem(user, 'Steel Bar 2kg');
    const unitSelect = screen.getByLabelText(/unit/i);
    await user.selectOptions(unitSelect, 'Kg');
    await user.type(screen.getByLabelText(/initial quantity/i), '120');
    await user.type(screen.getByLabelText(/minimum stock level/i), '60');

    await user.selectOptions(unitSelect, 'Pcs');

    expect(screen.getByLabelText(/initial quantity/i)).toHaveValue(10);
    expect(screen.getByLabelText(/minimum stock level/i)).toHaveValue(5);
  });

  it('handleSubmit with Kg unit: sends pieces to backend (converted), not raw kg', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ItemForm mode="create" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      { preloadedState }
    );

    await selectCustomItem(user, 'Steel Beam 5kg');
    const unitSelect = screen.getByLabelText(/unit/i);
    await user.selectOptions(unitSelect, 'Kg');

    await user.type(screen.getByLabelText(/item name/i), 'Test Item');
    await user.type(screen.getByLabelText(/sku/i), 'SKU-002');
    await user.type(screen.getByLabelText(/minimum stock level/i), '30');
    await user.type(screen.getByLabelText(/initial quantity/i), '60');
    // 30 kg = 1 piece, 60 kg = 2 pieces

    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const data = mockOnSubmit.mock.calls[0][0];
    expect(data.minStockLevel).toBe(1);
    expect(data.initialQuantity).toBe(2);
    expect(data.unit).toBe('Pcs');
  });

  it('non-weight items: no conversion logic applied, existing behavior unchanged', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ItemForm mode="create" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      { preloadedState }
    );

    // Do not select custom item - use common units (Nos, Pcs, Bag, etc.)
    await user.type(screen.getByLabelText(/item name/i), 'Regular Item');
    await user.type(screen.getByLabelText(/sku/i), 'SKU-003');
    await user.type(screen.getByLabelText(/minimum stock level/i), '5');
    await user.type(screen.getByLabelText(/initial quantity/i), '10');

    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const data = mockOnSubmit.mock.calls[0][0];
    expect(data.minStockLevel).toBe(5);
    expect(data.initialQuantity).toBe(10);
    expect(data.unit).toBe('Pcs');
  });
});
