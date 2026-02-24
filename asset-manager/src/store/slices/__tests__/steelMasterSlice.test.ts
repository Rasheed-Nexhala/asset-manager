jest.mock('../../thunks/steelMasterThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchSteelMasters: createAsyncThunk('steelMaster/fetch', async () => []),
    fetchSteelMasterById: createAsyncThunk('steelMaster/fetchById', async () => null),
    createSteelMaster: createAsyncThunk('steelMaster/create', async () => null),
    updateSteelMaster: createAsyncThunk('steelMaster/update', async () => null),
    deleteSteelMaster: createAsyncThunk('steelMaster/delete', async () => null),
  };
});

import steelMasterReducer, {
  setSteelMasters,
  setSelectedSteelMaster,
  addSteelMaster,
  updateSteelMasterInState,
  removeSteelMaster,
  clearSteelMasterError,
  clearSteelMasters,
} from '../steelMasterSlice';

const mockSteelMaster = {
  id: 'sm1',
  name: 'Steel Bar 12mm',
  hsnCode: '7214',
  weightPerMeter: 0.89,
} as import('../../types/steelMaster').SteelMaster;

describe('steelMasterSlice', () => {
  const initialState = {
    steelMasters: [],
    selectedSteelMaster: null,
    loading: false,
    error: null,
  };

  it('has correct initial state', () => {
    expect(steelMasterReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setSteelMasters sets steelMasters', () => {
    const state = steelMasterReducer(initialState, setSteelMasters([mockSteelMaster]));
    expect(state.steelMasters).toHaveLength(1);
    expect(state.steelMasters[0].name).toBe('Steel Bar 12mm');
  });

  it('setSelectedSteelMaster sets selectedSteelMaster', () => {
    const state = steelMasterReducer(initialState, setSelectedSteelMaster(mockSteelMaster));
    expect(state.selectedSteelMaster).toEqual(mockSteelMaster);
  });

  it('addSteelMaster adds new steel master', () => {
    const state = steelMasterReducer(initialState, addSteelMaster(mockSteelMaster));
    expect(state.steelMasters).toHaveLength(1);
  });

  it('addSteelMaster does not add duplicate', () => {
    const withOne = steelMasterReducer(initialState, addSteelMaster(mockSteelMaster));
    const state = steelMasterReducer(withOne, addSteelMaster(mockSteelMaster));
    expect(state.steelMasters).toHaveLength(1);
  });

  it('updateSteelMasterInState updates existing', () => {
    const withOne = steelMasterReducer(initialState, setSteelMasters([mockSteelMaster]));
    const updated = { ...mockSteelMaster, name: 'Steel Bar 16mm' };
    const state = steelMasterReducer(withOne, updateSteelMasterInState(updated));
    expect(state.steelMasters[0].name).toBe('Steel Bar 16mm');
  });

  it('removeSteelMaster removes by id', () => {
    const withOne = steelMasterReducer(initialState, setSteelMasters([mockSteelMaster]));
    const state = steelMasterReducer(withOne, removeSteelMaster('sm1'));
    expect(state.steelMasters).toHaveLength(0);
  });

  it('removeSteelMaster clears selectedSteelMaster when it matches', () => {
    const withOne = steelMasterReducer(initialState, setSteelMasters([mockSteelMaster]));
    const withSelected = steelMasterReducer(withOne, setSelectedSteelMaster(mockSteelMaster));
    const state = steelMasterReducer(withSelected, removeSteelMaster('sm1'));
    expect(state.selectedSteelMaster).toBe(null);
  });

  it('clearSteelMasterError clears error', () => {
    const withError = steelMasterReducer(
      { ...initialState, error: 'Error' },
      clearSteelMasterError()
    );
    expect(withError.error).toBe(null);
  });

  it('clearSteelMasters resets all', () => {
    const withData = steelMasterReducer(
      initialState,
      setSteelMasters([mockSteelMaster])
    );
    const state = steelMasterReducer(withData, clearSteelMasters());
    expect(state.steelMasters).toEqual([]);
    expect(state.selectedSteelMaster).toBe(null);
  });
});
