import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../../utils/activeManagedSiteStorage', () => ({
  loadActiveManagedSiteId: vi.fn(),
  saveActiveManagedSiteId: vi.fn(),
}));

import { useSiteManagerActiveSiteSync } from '../useSiteManagerActiveSiteSync';
import authReducer from '../../store/slices/authSlice';
import sitesReducer from '../../store/slices/sitesSlice';
import type { UserRoleData } from '../../types/roles';
import type { Site } from '../../types/sites';
import {
  loadActiveManagedSiteId,
  saveActiveManagedSiteId,
} from '../../utils/activeManagedSiteStorage';

const smRole: UserRoleData = {
  role: 'SiteManager',
  isActive: true,
  permissions: [],
};

function mockUser(uid: string): User {
  return { uid } as User;
}

function baseSite(overrides: Partial<Site> & Pick<Site, 'id' | 'name'>): Site {
  return {
    address: '1 Test St',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    managerId: 'sm-1',
    ...overrides,
  };
}

function createStore(preloaded: {
  auth: Parameters<typeof authReducer>[0];
  sites: Parameters<typeof sitesReducer>[0];
}) {
  return configureStore({
    reducer: { auth: authReducer, sites: sitesReducer },
    preloadedState: preloaded,
  });
}

describe('useSiteManagerActiveSiteSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadActiveManagedSiteId.mockReturnValue(null);
  });

  it('clears activeManagedSiteId when user is not a Site Manager', async () => {
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
      sites: {
        sites: [],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
        activeManagedSiteId: 'should-clear',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useSiteManagerActiveSiteSync(), { wrapper });

    await waitFor(() => {
      expect(store.getState().sites.activeManagedSiteId).toBeNull();
    });
  });

  it('clears activeManagedSiteId when Site Manager has no managed active sites', async () => {
    const store = createStore({
      auth: {
        user: mockUser('sm-1'),
        userRole: smRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
      sites: {
        sites: [],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
        activeManagedSiteId: 'orphan',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useSiteManagerActiveSiteSync(), { wrapper });

    await waitFor(() => {
      expect(store.getState().sites.activeManagedSiteId).toBeNull();
    });
  });

  it('sets first managed site by name when storage is empty and active is unset', async () => {
    const sites: Site[] = [
      baseSite({ id: 'site-b', name: 'Beta' }),
      baseSite({ id: 'site-a', name: 'Alpha' }),
    ];

    const store = createStore({
      auth: {
        user: mockUser('sm-1'),
        userRole: smRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
      sites: {
        sites,
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
        activeManagedSiteId: null,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useSiteManagerActiveSiteSync(), { wrapper });

    await waitFor(() => {
      expect(store.getState().sites.activeManagedSiteId).toBe('site-a');
    });

    expect(loadActiveManagedSiteId).toHaveBeenCalledWith('sm-1');
    expect(saveActiveManagedSiteId).toHaveBeenCalledWith('sm-1', 'site-a');
  });

  it('loads stored active id when it is still a managed site', async () => {
    loadActiveManagedSiteId.mockReturnValue('site-b');

    const sites: Site[] = [
      baseSite({ id: 'site-a', name: 'Alpha' }),
      baseSite({ id: 'site-b', name: 'Beta' }),
    ];

    const store = createStore({
      auth: {
        user: mockUser('sm-1'),
        userRole: smRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
      sites: {
        sites,
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
        activeManagedSiteId: null,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useSiteManagerActiveSiteSync(), { wrapper });

    await waitFor(() => {
      expect(store.getState().sites.activeManagedSiteId).toBe('site-b');
    });

    expect(saveActiveManagedSiteId).not.toHaveBeenCalled();
  });

  it('does not call storage load when activeManagedSiteId already matches a managed site', async () => {
    const sites: Site[] = [
      baseSite({ id: 'site-a', name: 'Alpha' }),
      baseSite({ id: 'site-b', name: 'Beta' }),
    ];

    const store = createStore({
      auth: {
        user: mockUser('sm-1'),
        userRole: smRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
      sites: {
        sites,
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
        activeManagedSiteId: 'site-b',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useSiteManagerActiveSiteSync(), { wrapper });

    await waitFor(() => {
      expect(store.getState().sites.activeManagedSiteId).toBe('site-b');
    });

    expect(loadActiveManagedSiteId).not.toHaveBeenCalled();
    expect(saveActiveManagedSiteId).not.toHaveBeenCalled();
  });
});
