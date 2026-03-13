import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { InventoryListItem } from '../InventoryListItem';
import type { InventoryEntry } from '../../../types/inventory';

jest.mock('../../../hooks/useWeightViewPreference', () => ({
  useWeightViewPreference: () => ({ viewMode: 'pieces', toggleViewMode: jest.fn() }),
}));

const mockEntry: InventoryEntry = {
  id: 'entry-1',
  itemId: 'item-1',
  itemName: 'Steel Rod',
  itemSku: 'STL-001',
  locationId: 'site_s1',
  locationType: 'site',
  locationName: 'North Site',
  quantity: 5,
  updatedAt: '2025-01-15T10:00:00.000Z',
};

describe('InventoryListItem', () => {
  it('renders item name, SKU and quantity', () => {
    render(
      <InventoryListItem
        entry={mockEntry}
        type="consumable"
        unit="piece"
      />
    );
    expect(screen.getByText('Steel Rod')).toBeTruthy();
    expect(screen.getByText('SKU: STL-001')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    render(
      <InventoryListItem
        entry={mockEntry}
        type="consumable"
        unit="piece"
        onPress={onPress}
      />
    );
    fireEvent.press(screen.getByRole('button', { name: /Item: Steel Rod/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders Request Transfer button when onRequestTransfer is provided', () => {
    const onRequestTransfer = jest.fn();
    render(
      <InventoryListItem
        entry={mockEntry}
        type="consumable"
        unit="piece"
        onRequestTransfer={onRequestTransfer}
      />
    );
    const transferButton = screen.getByRole('button', {
      name: 'Request transfer of Steel Rod',
    });
    expect(transferButton).toBeTruthy();

    fireEvent.press(transferButton);
    expect(onRequestTransfer).toHaveBeenCalledTimes(1);
  });

  it('does not render Request Transfer button when onRequestTransfer is not provided', () => {
    render(
      <InventoryListItem
        entry={mockEntry}
        type="consumable"
        unit="piece"
      />
    );
    expect(screen.queryByText('Request Transfer')).toBeNull();
  });
});
