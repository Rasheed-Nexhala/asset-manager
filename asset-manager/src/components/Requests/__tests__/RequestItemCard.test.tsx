/**
 * RequestItemCard tests
 * Covers unit display, entry modes (pieces/kg/ton), validation, and weight-based items
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RequestItemCard } from '../RequestItemCard';
import type { RequestItem } from '../../../types/request';

jest.mock('../../../hooks/useWeightViewPreference', () => ({
  useWeightViewPreference: () => ({ viewMode: 'pieces' }),
}));

const baseRequestItem: RequestItem = {
  itemId: 'item1',
  itemName: 'Steel Bar',
  itemSku: 'SKU-001',
  unit: 'Pieces',
  itemType: 'non_consumable',
  categoryId: 'cat1',
  categoryName: 'Steel',
  quantityRequested: 5,
  quantityApproved: 5,
  quantityReturned: 0,
  status: 'pending',
};

describe('RequestItemCard', () => {
  it('renders item name and SKU', () => {
    render(<RequestItemCard item={baseRequestItem} mode="view" />);

    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByText('SKU-001')).toBeTruthy();
  });

  it('displays quantity in pieces for non-weight item', () => {
    render(<RequestItemCard item={baseRequestItem} mode="create" onQuantityChange={jest.fn()} />);

    expect(screen.getByDisplayValue('5')).toBeTruthy();
  });

  it('shows Pcs/Kg/Ton toggle for weight-based item', () => {
    const steelItem: RequestItem = {
      ...baseRequestItem,
      weightPerMeter: 2.5,
      lengthPerPiece: 6,
    };

    render(<RequestItemCard item={steelItem} mode="create" onQuantityChange={jest.fn()} />);

    expect(screen.getByText('Pcs')).toBeTruthy();
    expect(screen.getByText('Kg')).toBeTruthy();
    expect(screen.getByText('Ton')).toBeTruthy();
  });

  it('validates whole number for discrete units (Bags)', () => {
    const bagItem: RequestItem = {
      ...baseRequestItem,
      unit: 'Bags',
      quantityRequested: 1,
    };

    const onQuantityChange = jest.fn();
    render(<RequestItemCard item={bagItem} mode="create" onQuantityChange={onQuantityChange} />);

    const input = screen.getByDisplayValue('1');
    fireEvent.changeText(input, '2.5');

    expect(screen.getByText(/Must be a whole number|whole number/)).toBeTruthy();
  });

  it('validates whole number for weight-based item in pieces mode', () => {
    const steelItem: RequestItem = {
      ...baseRequestItem,
      weightPerMeter: 2.5,
      lengthPerPiece: 6,
      quantityRequested: 1,
    };

    const onQuantityChange = jest.fn();
    render(<RequestItemCard item={steelItem} mode="create" onQuantityChange={onQuantityChange} />);

    const input = screen.getByDisplayValue('1');
    fireEvent.changeText(input, '3.7');

    expect(screen.getByText(/Pieces must be a whole number/)).toBeTruthy();
  });

  it('accepts valid kg input for weight-based item and converts to pieces', () => {
    const steelItem: RequestItem = {
      ...baseRequestItem,
      weightPerMeter: 5,
      lengthPerPiece: 6,
      quantityRequested: 1,
    };

    const onQuantityChange = jest.fn();
    render(<RequestItemCard item={steelItem} mode="create" onQuantityChange={onQuantityChange} />);

    fireEvent.press(screen.getByText('Kg'));
    const input = screen.getByDisplayValue('30'); // 1 piece = 30 kg
    fireEvent.changeText(input, '150'); // 150 kg / 30 kg per piece = 5 pieces (exact)

    expect(onQuantityChange).toHaveBeenCalledWith('item1', 5);
  });

  it('increment/decrement work in pieces mode', () => {
    const onQuantityChange = jest.fn();
    render(<RequestItemCard item={baseRequestItem} mode="create" onQuantityChange={onQuantityChange} />);

    const incrementButtons = screen.getAllByText('+');
    fireEvent.press(incrementButtons[0]);
    expect(onQuantityChange).toHaveBeenCalledWith('item1', 6);

    const decrementButtons = screen.getAllByText('−');
    fireEvent.press(decrementButtons[0]);
    expect(onQuantityChange).toHaveBeenCalledWith('item1', 5);
  });
});
