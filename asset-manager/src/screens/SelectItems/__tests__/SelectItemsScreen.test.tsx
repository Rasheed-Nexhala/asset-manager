/**
 * SelectItemsScreen — Paginated item selection with search
 * Tests: render, search, navigation on Add.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SelectItemsScreen } from '../SelectItemsScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Item } from '../../../types/inventory';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const defaultRouteParams = {
  returnScreen: 'CreateRequest',
  returnParams: { siteId: 'site1' },
  excludeItemIds: [] as string[],
};
let mockRouteParams: typeof defaultRouteParams = { ...defaultRouteParams };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockListItems = jest.fn();
const mockGetCount = jest.fn();
jest.mock('../../../services/firebase/inventoryService', () => ({
  listItemsForSelectionPaginated: (...args: unknown[]) => mockListItems(...args),
  getItemsForSelectionCount: (...args: unknown[]) => mockGetCount(...args),
  SELECTION_ITEMS_PAGE_SIZE: 15,
}));

function renderWithStore(ui: React.ReactElement, preloadedState: Partial<RootState> = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      sites: sitesReducer,
      inventory: inventoryReducer,
      requests: requestsReducer,
      steelMaster: steelMasterReducer,
      maintenance: maintenanceReducer,
      activityLog: activityLogReducer,
      purchaseOrders: purchaseOrderReducer,
    } as Record<string, React.Reducer<unknown, { type: string }>>,
    preloadedState: preloadedState as Partial<RootState>,
  });
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}

const iso = '2024-01-01T00:00:00.000Z';

/** Low stock per isLowStock: centralStoreQuantity <= minStockLevel */
function makeItem(overrides: Partial<Item> & { id: string; name: string }): Item {
  return {
    sku: `SKU-${overrides.id}`,
    description: '',
    categoryId: null,
    categoryName: 'Cat',
    type: 'consumable',
    unit: 'pcs',
    minStockLevel: 20,
    status: 'active',
    totalQuantity: 50,
    centralStoreQuantity: 5,
    atSitesQuantity: 30,
    inMaintenanceQuantity: 15,
    createdAt: iso,
    updatedAt: iso,
    ...overrides,
  } as Item;
}

const lowStockItem = makeItem({
  id: 'item-low',
  name: 'Low Stock Bolt',
  centralStoreQuantity: 5,
  minStockLevel: 20,
});

const notLowStockItem = makeItem({
  id: 'item-ok',
  name: 'Well Stocked Nut',
  centralStoreQuantity: 100,
  minStockLevel: 20,
});

const authBase: NonNullable<RootState['auth']> = {
  user: { uid: 'u1', email: 'u@test.com', displayName: 'User' } as import('firebase/auth').User,
  isLoading: false,
  isRoleLoading: false,
  authInitialized: true,
  error: null,
  isAuthenticated: true,
  userRole: null,
};

describe('SelectItemsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { ...defaultRouteParams };
    mockListItems.mockResolvedValue({ items: [], lastDoc: null });
    mockGetCount.mockResolvedValue(0);
  });

  it('renders loading state initially', async () => {
    mockListItems.mockImplementation(() => new Promise(() => {}));
    mockGetCount.mockImplementation(() => new Promise(() => {}));

    renderWithStore(<SelectItemsScreen />);

    expect(screen.getByText('Select Items')).toBeTruthy();
    expect(screen.getByText('Loading items…')).toBeTruthy();
  });

  it('renders search bar and empty state when no items', async () => {
    const { findByText } = renderWithStore(<SelectItemsScreen />);

    await findByText('No items available');

    expect(screen.getByPlaceholderText('Search by name, SKU, or category...')).toBeTruthy();
    expect(screen.getByText('Showing 0 of 0 items')).toBeTruthy();
  });

  it('navigates back when back is pressed', async () => {
    const { findByText } = renderWithStore(<SelectItemsScreen />);
    await findByText('No items available');

    fireEvent.press(screen.getByLabelText('Go back'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  describe('PO flow (CreatePO): StoreIncharge vs SuperAdmin low-stock filter', () => {
    beforeEach(() => {
      mockRouteParams = {
        returnScreen: 'CreatePO',
        returnParams: {},
        excludeItemIds: [],
      };
      mockListItems.mockResolvedValue({
        items: [lowStockItem, notLowStockItem],
        lastDoc: null,
      });
      mockGetCount.mockResolvedValue(2);
    });

    it('StoreIncharge: after load, only low-stock item appears in the list', async () => {
      const { findByText, queryByText } = renderWithStore(<SelectItemsScreen />, {
        auth: {
          ...authBase,
          userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
        },
      });

      await findByText('Low Stock Bolt');
      expect(queryByText('Well Stocked Nut')).toBeNull();
      await findByText('1 item below minimum stock');
    });

    it('SuperAdmin: after load, non-low-stock item is visible alongside low-stock', async () => {
      const { findByText } = renderWithStore(<SelectItemsScreen />, {
        auth: {
          ...authBase,
          userRole: { role: 'SuperAdmin', isActive: true, permissions: [] },
        },
      });

      await findByText('Low Stock Bolt');
      await findByText('Well Stocked Nut');
      await findByText('Showing 2 of 2 items');
    });
  });
});
