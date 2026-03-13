import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';
import { ItemCard } from '../ItemCard';

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

const uncategorizedItem = {
  id: 'item3',
  name: 'Uncategorized Tool',
  sku: 'SKU-003',
  categoryId: null,
  categoryName: null,
  type: 'non_consumable' as const,
  unit: 'piece',
  minStockLevel: 5,
  status: 'active' as const,
  totalQuantity: 25,
  centralStoreQuantity: 15,
  atSitesQuantity: 8,
  inMaintenanceQuantity: 2,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
} as import('../../../types/inventory').Item;

async function renderItemCard(props: React.ComponentProps<typeof ItemCard>) {
  const result = render(
    <WeightViewPreferenceProvider>
      <ItemCard {...props} />
    </WeightViewPreferenceProvider>
  );
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return result;
}

describe('ItemCard', () => {
  it('renders item name and SKU', async () => {
    await renderItemCard({ item: mockItem, onPress: jest.fn() });

    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByText(/SKU: SKU-001/)).toBeTruthy();
  });

  it('renders Non-Consumable badge for non_consumable type', async () => {
    await renderItemCard({ item: mockItem, onPress: jest.fn() });
    expect(screen.getByText('Non-Consumable')).toBeTruthy();
  });

  it('renders Consumable badge for consumable type', async () => {
    const consumableItem = { ...mockItem, type: 'consumable' as const };
    await renderItemCard({ item: consumableItem, onPress: jest.fn() });
    expect(screen.getByText('Consumable')).toBeTruthy();
  });

  it('shows Low Stock badge when quantity at or below minStockLevel', async () => {
    await renderItemCard({ item: lowStockItem, onPress: jest.fn() });
    expect(screen.getByText('Low Stock')).toBeTruthy();
  });

  it('does not show Low Stock badge when quantity above minStockLevel', async () => {
    await renderItemCard({ item: mockItem, onPress: jest.fn() });
    expect(screen.queryByText('Low Stock')).toBeNull();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderItemCard({ item: mockItem, onPress });

    fireEvent.press(screen.getByRole('button', { name: /Item: Steel Bar/i }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders stock quantities', async () => {
    await renderItemCard({ item: mockItem, onPress: jest.fn() });
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('Central Store')).toBeTruthy();
    expect(screen.getByText('At Sites')).toBeTruthy();
    expect(screen.getByText('Maintenance')).toBeTruthy();
  });

  it('renders uncategorized items correctly', async () => {
    await renderItemCard({ item: uncategorizedItem, onPress: jest.fn() });
    
    expect(screen.getByText('Uncategorized Tool')).toBeTruthy();
    expect(screen.getByText(/SKU: SKU-003/)).toBeTruthy();
    expect(screen.getByText('Non-Consumable')).toBeTruthy();
    
    // Should still display stock information for uncategorized items
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('Central Store')).toBeTruthy();
  });

  it('handles low stock detection for uncategorized items', async () => {
    const lowStockUncategorized = {
      ...uncategorizedItem,
      centralStoreQuantity: 2,
      minStockLevel: 10,
    };
    
    await renderItemCard({ item: lowStockUncategorized, onPress: jest.fn() });
    
    expect(screen.getByText('Low Stock')).toBeTruthy();
    expect(screen.getByText('Uncategorized Tool')).toBeTruthy();
  });

  it('calls onPress for uncategorized items', async () => {
    const onPress = jest.fn();
    await renderItemCard({ item: uncategorizedItem, onPress });

    fireEvent.press(screen.getByRole('button', { name: /Item: Uncategorized Tool/i }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
