/**
 * InventoryAdjustmentModal tests
 * Covers unit conversions (pieces/kg/ton), discrete unit validation, weight-based items
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { InventoryAdjustmentModal } from '../InventoryAdjustmentModal';
import type { Item } from '../../../types/inventory';

const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
const mockOnCancel = jest.fn();

const baseItem: Item = {
  id: 'item1',
  name: 'Cement Bag',
  sku: 'SKU-001',
  categoryId: 'cat1',
  categoryName: 'Building',
  type: 'consumable',
  unit: 'Bag',
  minStockLevel: 10,
  status: 'active',
  totalQuantity: 50,
  centralStoreQuantity: 30,
  atSitesQuantity: 15,
  inMaintenanceQuantity: 5,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const steelItem: Item = {
  ...baseItem,
  id: 'steel1',
  name: 'Steel Rebar',
  sku: 'SKU-STEEL',
  unit: 'Pcs',
  weightPerMeter: 5,
  lengthPerPiece: 6,
  centralStoreQuantity: 100,
};

function renderModal(props: Partial<React.ComponentProps<typeof InventoryAdjustmentModal>> = {}) {
  return render(
    <InventoryAdjustmentModal
      visible
      mode="add"
      item={baseItem}
      onSubmit={mockOnSubmit}
      onCancel={mockOnCancel}
      {...props}
    />
  );
}

describe('InventoryAdjustmentModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Add Stock for add mode', () => {
    renderModal();

    expect(screen.getByRole('button', { name: 'Add Stock' })).toBeTruthy();
    expect(screen.getByText('Cement Bag')).toBeTruthy();
  });

  it('shows Pcs/Kg/Ton entry mode for weight-based item', () => {
    renderModal({ item: steelItem });

    expect(screen.getByRole('radio', { name: 'pieces entry mode' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'kg entry mode' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'ton entry mode' })).toBeTruthy();
  });

  it('validates discrete unit (Bags) requires whole number', () => {
    renderModal({ item: { ...baseItem, unit: 'Bags' } });

    fireEvent.changeText(screen.getByLabelText('Amount input'), '2.5');
    fireEvent.press(screen.getByRole('radio', { name: 'Reason: Purchase' }));
    fireEvent.changeText(screen.getByLabelText('Notes input'), 'Test notes');
    fireEvent.press(screen.getByRole('button', { name: 'Add Stock' }));

    expect(screen.getByText(/must be a whole number|Decimals are not allowed/)).toBeTruthy();
  });

  it('accepts valid kg input for weight-based item and submits converted pieces', async () => {
    renderModal({ item: steelItem, mode: 'add' });

    fireEvent.press(screen.getByRole('radio', { name: 'kg entry mode' }));
    fireEvent.changeText(screen.getByLabelText('Amount input'), '150'); // 150 kg = 5 pieces (exact)
    fireEvent.press(screen.getByRole('radio', { name: 'Reason: Purchase' }));
    fireEvent.changeText(screen.getByLabelText('Notes input'), 'Test notes');

    fireEvent.press(screen.getByRole('button', { name: 'Add Stock' }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 5,
          entryMode: 'kg',
          enteredValue: 150,
        })
      );
    });
  });

  it('validates inexact kg conversion shows error for weight-based item', () => {
    renderModal({ item: steelItem });

    fireEvent.press(screen.getByRole('radio', { name: 'kg entry mode' }));
    fireEvent.changeText(screen.getByLabelText('Amount input'), '100'); // 100 kg = 3.33... pieces (inexact)
    fireEvent.press(screen.getByRole('radio', { name: 'Reason: Purchase' }));
    fireEvent.changeText(screen.getByLabelText('Notes input'), 'Test notes');
    fireEvent.press(screen.getByRole('button', { name: 'Add Stock' }));

    expect(screen.getByText(/Cannot convert|exact pieces/)).toBeTruthy();
  });
});
