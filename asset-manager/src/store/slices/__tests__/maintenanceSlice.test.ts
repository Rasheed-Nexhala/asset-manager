jest.mock('../../thunks/maintenanceThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchMaintenanceRecords: createAsyncThunk('maintenance/fetch', async () => []),
    fetchMaintenanceById: createAsyncThunk('maintenance/fetchById', async () => null),
    addToMaintenanceThunk: createAsyncThunk('maintenance/add', async () => null),
    returnFromMaintenanceThunk: createAsyncThunk('maintenance/return', async () => null),
    writeOffItemThunk: createAsyncThunk('maintenance/writeOff', async () => null),
    addMaintenanceUpdateThunk: createAsyncThunk('maintenance/addUpdate', async () => null),
  };
});

import maintenanceReducer, {
  setMaintenanceRecords,
  setSelectedMaintenance,
  addMaintenanceRecord,
  updateMaintenanceInState,
  removeMaintenanceRecord,
  setFilters,
  clearFilters,
  setLoading,
  setError,
  clearError,
} from '../maintenanceSlice';

const mockMaintenance = {
  id: 'm1',
  itemId: 'item1',
  itemName: 'Steel Bar',
  status: 'pending',
  quantity: 5,
} as import('../../types/maintenance').Maintenance;

describe('maintenanceSlice', () => {
  const initialState = {
    maintenanceRecords: [],
    selectedMaintenance: null,
    loading: false,
    error: null,
    errorTimestamp: null,
    filters: { status: 'all' },
  };

  it('has correct initial state', () => {
    expect(maintenanceReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setMaintenanceRecords sets records and clears loading', () => {
    const state = maintenanceReducer(
      initialState,
      setMaintenanceRecords([mockMaintenance])
    );
    expect(state.maintenanceRecords).toHaveLength(1);
    expect(state.loading).toBe(false);
  });

  it('setSelectedMaintenance sets selectedMaintenance', () => {
    const state = maintenanceReducer(
      initialState,
      setSelectedMaintenance(mockMaintenance)
    );
    expect(state.selectedMaintenance).toEqual(mockMaintenance);
  });

  it('addMaintenanceRecord prepends record', () => {
    const state = maintenanceReducer(
      initialState,
      addMaintenanceRecord(mockMaintenance)
    );
    expect(state.maintenanceRecords[0]).toEqual(mockMaintenance);
  });

  it('updateMaintenanceInState updates existing record', () => {
    const withRecord = maintenanceReducer(
      initialState,
      setMaintenanceRecords([mockMaintenance])
    );
    const updated = { ...mockMaintenance, status: 'returned' };
    const state = maintenanceReducer(withRecord, updateMaintenanceInState(updated));
    expect(state.maintenanceRecords[0].status).toBe('returned');
  });

  it('updateMaintenanceInState updates selectedMaintenance when it matches', () => {
    const withRecord = maintenanceReducer(
      initialState,
      setMaintenanceRecords([mockMaintenance])
    );
    const withSelected = maintenanceReducer(
      withRecord,
      setSelectedMaintenance(mockMaintenance)
    );
    const updated = { ...mockMaintenance, status: 'returned' };
    const state = maintenanceReducer(
      withSelected,
      updateMaintenanceInState(updated)
    );
    expect(state.selectedMaintenance?.status).toBe('returned');
  });

  it('removeMaintenanceRecord removes by id', () => {
    const withRecord = maintenanceReducer(
      initialState,
      setMaintenanceRecords([mockMaintenance])
    );
    const state = maintenanceReducer(withRecord, removeMaintenanceRecord('m1'));
    expect(state.maintenanceRecords).toHaveLength(0);
  });

  it('setFilters sets filters', () => {
    const state = maintenanceReducer(
      initialState,
      setFilters({ status: 'pending' })
    );
    expect(state.filters.status).toBe('pending');
  });

  it('clearFilters resets filters', () => {
    const withFilters = maintenanceReducer(
      initialState,
      setFilters({ status: 'returned' })
    );
    const state = maintenanceReducer(withFilters, clearFilters());
    expect(state.filters.status).toBe('all');
  });

  it('setLoading sets loading', () => {
    const state = maintenanceReducer(initialState, setLoading(true));
    expect(state.loading).toBe(true);
  });

  it('setError sets error', () => {
    const state = maintenanceReducer(initialState, setError('Failed'));
    expect(state.error).toBe('Failed');
  });

  it('clearError clears error', () => {
    const withError = maintenanceReducer(initialState, setError('Error'));
    const state = maintenanceReducer(withError, clearError());
    expect(state.error).toBe(null);
  });
});
