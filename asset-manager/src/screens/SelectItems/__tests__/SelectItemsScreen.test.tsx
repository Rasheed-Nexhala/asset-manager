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

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockRouteParams = {
  returnScreen: 'CreateRequest',
  returnParams: { siteId: 'site1' },
  excludeItemIds: [] as string[],
};
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

describe('SelectItemsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
