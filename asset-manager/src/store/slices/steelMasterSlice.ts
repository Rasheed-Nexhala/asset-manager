import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SteelMaster } from '../../types/steelMaster';
import { sanitizeForDisplay } from '../../utils/sanitizeUtils';
import {
  fetchSteelMasters,
  fetchSteelMasterById,
  createSteelMaster,
  updateSteelMaster,
  deleteSteelMaster,
} from '../thunks/steelMasterThunks';

interface SteelMasterState {
  steelMasters: SteelMaster[];
  selectedSteelMaster: SteelMaster | null;
  loading: boolean;
  error: string | null;
}

const initialState: SteelMasterState = {
  steelMasters: [],
  selectedSteelMaster: null,
  loading: false,
  error: null,
};

const steelMasterSlice = createSlice({
  name: 'steelMaster',
  initialState,
  reducers: {
    setSteelMasters: (state, action: PayloadAction<SteelMaster[]>) => {
      state.steelMasters = action.payload;
    },
    setSelectedSteelMaster: (
      state,
      action: PayloadAction<SteelMaster | null>
    ) => {
      state.selectedSteelMaster = action.payload;
    },
    addSteelMaster: (state, action: PayloadAction<SteelMaster>) => {
      const exists = state.steelMasters.some((sm) => sm.id === action.payload.id);
      if (!exists) {
        state.steelMasters.push(action.payload);
      }
    },
    updateSteelMasterInState: (state, action: PayloadAction<SteelMaster>) => {
      const index = state.steelMasters.findIndex(
        (sm) => sm.id === action.payload.id
      );
      if (index !== -1) {
        state.steelMasters[index] = action.payload;
      }
      if (
        state.selectedSteelMaster?.id === action.payload.id
      ) {
        state.selectedSteelMaster = action.payload;
      }
    },
    removeSteelMaster: (state, action: PayloadAction<string>) => {
      state.steelMasters = state.steelMasters.filter(
        (sm) => sm.id !== action.payload
      );
      if (state.selectedSteelMaster?.id === action.payload) {
        state.selectedSteelMaster = null;
      }
    },
    clearSteelMasterError: (state) => {
      state.error = null;
    },
    clearSteelMasters: (state) => {
      state.steelMasters = [];
      state.selectedSteelMaster = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch steel masters
      .addCase(fetchSteelMasters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSteelMasters.fulfilled, (state, action) => {
        state.loading = false;
        state.steelMasters = action.payload;
        state.error = null;
      })
      .addCase(fetchSteelMasters.rejected, (state, action) => {
        state.loading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
      })
      // Fetch steel master by ID
      .addCase(fetchSteelMasterById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSteelMasterById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSteelMaster = action.payload;
        state.error = null;
      })
      .addCase(fetchSteelMasterById.rejected, (state, action) => {
        state.loading = false;
        state.selectedSteelMaster = null;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
      })
      // Create steel master
      .addCase(createSteelMaster.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSteelMaster.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const exists = state.steelMasters.some(
            (sm) => sm.id === action.payload!.id
          );
          if (!exists) {
            state.steelMasters.push(action.payload);
          }
        }
        state.error = null;
      })
      .addCase(createSteelMaster.rejected, (state, action) => {
        state.loading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
      })
      // Update steel master
      .addCase(updateSteelMaster.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSteelMaster.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const index = state.steelMasters.findIndex(
            (sm) => sm.id === action.payload!.id
          );
          if (index !== -1) {
            state.steelMasters[index] = action.payload!;
          }
          if (state.selectedSteelMaster?.id === action.payload!.id) {
            state.selectedSteelMaster = action.payload!;
          }
        }
        state.error = null;
      })
      .addCase(updateSteelMaster.rejected, (state, action) => {
        state.loading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
      })
      // Delete steel master (soft delete - payload is the id string)
      .addCase(deleteSteelMaster.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSteelMaster.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload as string;
        if (deletedId) {
          state.steelMasters = state.steelMasters.map((sm) =>
            sm.id === deletedId ? { ...sm, isActive: false } : sm
          );
          if (state.selectedSteelMaster?.id === deletedId) {
            state.selectedSteelMaster = null;
          }
        }
        state.error = null;
      })
      .addCase(deleteSteelMaster.rejected, (state, action) => {
        state.loading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
      });
  },
});

export const {
  setSteelMasters,
  setSelectedSteelMaster,
  addSteelMaster,
  updateSteelMasterInState,
  removeSteelMaster,
  clearSteelMasterError,
  clearSteelMasters,
} = steelMasterSlice.actions;

export default steelMasterSlice.reducer;
