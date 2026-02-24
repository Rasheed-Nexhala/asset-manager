jest.mock('../../thunks/sitesThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchSites: createAsyncThunk('sites/fetchSites', async () => []),
    createSite: createAsyncThunk('sites/createSite', async () => null),
    updateSite: createAsyncThunk('sites/updateSite', async () => null),
  };
});
jest.mock('../../thunks/managerValidationThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    cleanupManagerAssignments: createAsyncThunk(
      'managerValidation/cleanup',
      async () => ({ sitesUpdated: 0, managerId: 'm1' })
    ),
    validateAllManagerAssignments: createAsyncThunk(
      'managerValidation/validateAll',
      async () => ({ sitesUpdated: 0, managersCleaned: [] })
    ),
  };
});

import sitesReducer, {
  setSites,
  addSite,
  updateSiteInState,
  setSearchQuery,
  setLoading,
  setError,
  clearError,
} from '../sitesSlice';
import { fetchSites } from '../../thunks/sitesThunks';

const mockSite = {
  id: 'site1',
  name: 'Site Alpha',
  address: '123 Main St',
  managerId: null,
} as import('../../types/sites').Site;

describe('sitesSlice', () => {
  const initialState = {
    sites: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    validationLoading: false,
    lastValidationAt: null,
  };

  it('has correct initial state', () => {
    expect(sitesReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setSites sets sites', () => {
    const state = sitesReducer(initialState, setSites([mockSite]));
    expect(state.sites).toHaveLength(1);
    expect(state.sites[0].name).toBe('Site Alpha');
  });

  it('addSite appends site', () => {
    const state = sitesReducer(initialState, addSite(mockSite));
    expect(state.sites).toHaveLength(1);
  });

  it('updateSiteInState updates existing site', () => {
    const withSite = sitesReducer(initialState, setSites([mockSite]));
    const updated = { ...mockSite, name: 'Site Beta' };
    const state = sitesReducer(withSite, updateSiteInState(updated));
    expect(state.sites[0].name).toBe('Site Beta');
  });

  it('setSearchQuery sets searchQuery', () => {
    const state = sitesReducer(initialState, setSearchQuery('alpha'));
    expect(state.searchQuery).toBe('alpha');
  });

  it('setLoading sets isLoading', () => {
    const state = sitesReducer(initialState, setLoading(true));
    expect(state.isLoading).toBe(true);
  });

  it('setError sets error', () => {
    const state = sitesReducer(initialState, setError('Failed'));
    expect(state.error).toBe('Failed');
  });

  it('clearError clears error', () => {
    const withError = sitesReducer(initialState, setError('Error'));
    const state = sitesReducer(withError, clearError());
    expect(state.error).toBe(null);
  });

  it('fetchSites.fulfilled sets sites', () => {
    const state = sitesReducer(
      initialState,
      fetchSites.fulfilled([mockSite], 'req1')
    );
    expect(state.sites).toEqual([mockSite]);
    expect(state.isLoading).toBe(false);
  });
});
