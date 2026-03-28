import React from 'react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User } from 'firebase/auth';

const mockUnsub = vi.fn();
let accessCallback:
  | ((s: {
      centralStoreAccessExpiresAt: string | null;
      maintenanceWriteOffAccessExpiresAt: string | null;
    }) => void)
  | null = null;

vi.mock('../../services/firebase/inventoryUpdateRequestService', () => ({
  subscribeToMyActiveAccess: vi.fn(
    (
      _userId: string,
      cb: (s: {
        centralStoreAccessExpiresAt: string | null;
        maintenanceWriteOffAccessExpiresAt: string | null;
      }) => void
    ) => {
      accessCallback = cb;
      return mockUnsub;
    }
  ),
}));

import { useInventoryAccessSync } from '../useInventoryAccessSync';
import authReducer from '../../store/slices/authSlice';
import sitesReducer from '../../store/slices/sitesSlice';
import inventoryReducer from '../../store/slices/inventorySlice';
import requestsReducer from '../../store/slices/requestsSlice';
import steelMasterReducer from '../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../store/slices/maintenanceSlice';
import activityLogReducer from '../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../store/slices/purchaseOrderSlice';
import inventoryUpdateRequestReducer from '../../store/slices/inventoryUpdateRequestSlice';
import type { RootState } from '../../store';

const rootReducer = combineReducers({
  auth: authReducer,
  sites: sitesReducer,
  inventory: inventoryReducer,
  requests: requestsReducer,
  steelMaster: steelMasterReducer,
  maintenance: maintenanceReducer,
  activityLog: activityLogReducer,
  purchaseOrders: purchaseOrderReducer,
  inventoryUpdateRequest: inventoryUpdateRequestReducer,
});

function createStore(preloadedState: Partial<RootState> = {}) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as Partial<RootState>,
  });
}

function mockUser(uid: string): User {
  return { uid } as User;
}

describe('useInventoryAccessSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessCallback = null;
  });

  it('clears access windows when not Store Incharge', () => {
    const store = createStore({
      auth: {
        user: mockUser('u1'),
        userRole: { role: 'Admin', isActive: true, permissions: [] },
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
      inventoryUpdateRequest: {
        pendingRequests: [],
        activeApprovedRequests: [],
        loading: false,
        error: null,
        myAccessGrantedUntil: '2025-01-01',
        myWriteOffAccessGrantedUntil: '2025-01-02',
      },
    } as Partial<RootState>);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useInventoryAccessSync(), { wrapper });

    expect(store.getState().inventoryUpdateRequest.myAccessGrantedUntil).toBeNull();
    expect(store.getState().inventoryUpdateRequest.myWriteOffAccessGrantedUntil).toBeNull();
  });

  it('subscribes for Store Incharge and applies summary', () => {
    const store = createStore({
      auth: {
        user: mockUser('si1'),
        userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
    } as Partial<RootState>);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useInventoryAccessSync(), { wrapper });

    accessCallback?.({
      centralStoreAccessExpiresAt: 't1',
      maintenanceWriteOffAccessExpiresAt: 't2',
    });

    expect(store.getState().inventoryUpdateRequest.myAccessGrantedUntil).toBe('t1');
    expect(store.getState().inventoryUpdateRequest.myWriteOffAccessGrantedUntil).toBe('t2');
  });

  it('unsubscribes on unmount', () => {
    const store = createStore({
      auth: {
        user: mockUser('si1'),
        userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
    } as Partial<RootState>);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { unmount } = renderHook(() => useInventoryAccessSync(), { wrapper });
    unmount();
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });
});
