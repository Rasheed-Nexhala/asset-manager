/**
 * UsersScreen tests
 * - Renders header "Users" and Users component
 * - Shows loading overlay when Users reports loading and no data
 * - Hides loading when Users reports data received
 * - Back button calls goBack
 *
 * Mocks userRoleService.subscribeToAllUsers to control when Users reports data.
 */
jest.mock('firebase/auth', () => ({ User: function User() {} }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({})),
}));
jest.mock('../../../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
}));
jest.mock('../../../services/firebase/authService', () => ({
  updatePassword: jest.fn().mockResolvedValue(undefined),
  reauthenticateWithPassword: jest.fn().mockResolvedValue(undefined),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
}));

const mockSubscribeCallbackRef: { current: ((users: unknown[]) => void) | null } = { current: null };
jest.mock('../../../services/firebase/userRoleService', () => ({
  getUserRole: jest.fn().mockResolvedValue(null),
  subscribeToUserRole: jest.fn(() => jest.fn()),
  subscribeToAllUsers: jest.fn((callback: (users: unknown[]) => void) => {
    mockSubscribeCallbackRef.current = callback;
    return jest.fn();
  }),
  updateUserRole: jest.fn().mockResolvedValue(undefined),
  updateUserActiveStatus: jest.fn().mockResolvedValue(undefined),
  getAllUsers: jest.fn().mockResolvedValue([]),
  setUserRole: jest.fn().mockResolvedValue(undefined),
  createDefaultUserDocument: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { UsersScreen } from '../UsersScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { UserListItem } from '../../../types/roles';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUserListItem: UserListItem = {
  id: 'u1',
  email: 'admin@example.com',
  displayName: 'Admin User',
  role: 'Admin',
  isActive: true,
  permissions: [],
};

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

describe('UsersScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockSubscribeCallbackRef.current = null;
  });

  it('renders header "Users" and Users component', async () => {
    renderWithStore(<UsersScreen />);

    expect(screen.getByText('Users')).toBeTruthy();

    await act(async () => {
      mockSubscribeCallbackRef.current?.([mockUserListItem]);
    });

    expect(screen.getByText('Admin User')).toBeTruthy();
  });

  it('shows loading overlay when Users reports loading and no data', () => {
    renderWithStore(<UsersScreen />);

    expect(screen.getByLabelText('Loading users')).toBeTruthy();
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('hides loading when Users reports data received', async () => {
    renderWithStore(<UsersScreen />);

    await act(async () => {
      mockSubscribeCallbackRef.current?.([mockUserListItem]);
    });

    expect(screen.queryByLabelText('Loading users')).toBeNull();
    expect(screen.queryByText('Loading...')).toBeNull();
  });

  it('back button calls goBack', async () => {
    renderWithStore(<UsersScreen />);

    await act(async () => {
      mockSubscribeCallbackRef.current?.([mockUserListItem]);
    });

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
