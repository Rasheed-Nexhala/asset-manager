import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';
import { ItemCard } from '../ItemCard';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

const mockItem = {
  id: 'item1',
  name: 'Steel Bar',
  sku: 'SKU-001',
  categoryId: 'cat1',
  categoryName: 'Steel',
  type: 'non_consumable' as const,
  unit: 'piece',
  minStockLevel: 10,
  status: 'active' as const,
  totalQuantity: 50,
  centralStoreQuantity: 30,
  atSitesQuantity: 15,
  inMaintenanceQuantity: 5,
} as import('../../../types/inventory').Item;

const lowStockItem = {
  ...mockItem,
  id: 'item2',
  name: 'Low Stock Item',
  sku: 'SKU-002',
  totalQuantity: 5,
  minStockLevel: 10,
  centralStoreQuantity: 3,
  atSitesQuantity: 2,
  inMaintenanceQuantity: 0,
} as import('../../../types/inventory').Item;

function renderItemCard(props: React.ComponentProps<typeof ItemCard>) {
  return render(
    <WeightViewPreferenceProvider>
      <ItemCard {...props} />
    </WeightViewPreferenceProvider>
  );
}

describe('ItemCard', () => {
  it('renders item name and SKU', () => {
    renderItemCard({ item: mockItem, onPress: jest.fn() });

    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByText(/SKU: SKU-001/)).toBeTruthy();
  });

  it('renders Non-Consumable badge for non_consumable type', () => {
    renderItemCard({ item: mockItem, onPress: jest.fn() });
    expect(screen.getByText('Non-Consumable')).toBeTruthy();
  });

  it('renders Consumable badge for consumable type', () => {
    const consumableItem = { ...mockItem, type: 'consumable' as const };
    renderItemCard({ item: consumableItem, onPress: jest.fn() });
    expect(screen.getByText('Consumable')).toBeTruthy();
  });

  it('shows Low Stock badge when quantity at or below minStockLevel', () => {
    renderItemCard({ item: lowStockItem, onPress: jest.fn() });
    expect(screen.getByText('Low Stock')).toBeTruthy();
  });

  it('does not show Low Stock badge when quantity above minStockLevel', () => {
    renderItemCard({ item: mockItem, onPress: jest.fn() });
    expect(screen.queryByText('Low Stock')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    renderItemCard({ item: mockItem, onPress });

    fireEvent.press(screen.getByRole('button', { name: /Item: Steel Bar/i }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders stock quantities', () => {
    renderItemCard({ item: mockItem, onPress: jest.fn() });
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('Central Store')).toBeTruthy();
    expect(screen.getByText('At Sites')).toBeTruthy();
    expect(screen.getByText('Maintenance')).toBeTruthy();
  });
});
