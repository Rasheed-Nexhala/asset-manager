import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Maintenance, MaintenanceStatus } from '../../types/maintenance';
import { sanitizeForDisplay } from '../../utils/sanitizeUtils';
import {
  fetchMaintenanceRecords,
  fetchMaintenanceById,
  addToMaintenanceThunk,
  returnFromMaintenanceThunk,
  writeOffItemThunk,
  addMaintenanceUpdateThunk,
} from '../thunks/maintenanceThunks';

/** Safely extract error message from thunk rejection payload, then sanitize for XSS */
const getErrorMessage = (payload: unknown): string => {
  let msg: string;
  if (typeof payload === 'string') msg = payload;
  else if (payload instanceof Error) msg = payload.message;
  else if (payload && typeof payload === 'object' && 'message' in payload) {
    msg = String((payload as { message: unknown }).message);
  } else {
    msg = 'An unexpected error occurred';
  }
  return sanitizeForDisplay(msg) || 'An unexpected error occurred';
};

interface MaintenanceState {
  maintenanceRecords: Maintenance[];
  selectedMaintenance: Maintenance | null;
  loading: boolean;
  error: string | null;
  errorTimestamp: number | null;
  filters: {
    status: MaintenanceStatus | 'all';
  };
}

const initialState: MaintenanceState = {
  maintenanceRecords: [],
  selectedMaintenance: null,
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: {
    status: 'all',
  },
};

const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState,
  reducers: {
    // Bulk set maintenance records (from real-time subscription)
    setMaintenanceRecords: (state, action: PayloadAction<Maintenance[]>) => {
      state.maintenanceRecords = action.payload;
      state.loading = false;
    },
    
    // Set selected maintenance record
    setSelectedMaintenance: (state, action: PayloadAction<Maintenance | null>) => {
      state.selectedMaintenance = action.payload;
    },
    
    // Add new maintenance record (optimistic update)
    addMaintenanceRecord: (state, action: PayloadAction<Maintenance>) => {
      state.maintenanceRecords.unshift(action.payload);
    },
    
    // Update existing maintenance record
    updateMaintenanceInState: (state, action: PayloadAction<Maintenance>) => {
      const index = state.maintenanceRecords.findIndex(
        (m) => m.id === action.payload.id
      );
      if (index !== -1) {
        state.maintenanceRecords[index] = action.payload;
      }
      
      // Update selected if it's the same record
      if (state.selectedMaintenance?.id === action.payload.id) {
        state.selectedMaintenance = action.payload;
      }
    },
    
    // Remove maintenance record (after full return or write-off)
    removeMaintenanceRecord: (state, action: PayloadAction<string>) => {
      state.maintenanceRecords = state.maintenanceRecords.filter(
        (m) => m.id !== action.payload
      );
      
      // Clear selected if it's the removed record
      if (state.selectedMaintenance?.id === action.payload) {
        state.selectedMaintenance = null;
      }
    },
    
    // Set filters
    setFilters: (
      state,
      action: PayloadAction<{ status: MaintenanceStatus | 'all' }>
    ) => {
      state.filters = action.payload;
    },
    
    // Clear filters
    clearFilters: (state) => {
      state.filters = { status: 'all' };
    },
    
    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Error handling
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.errorTimestamp = Date.now();
      state.loading = false;
    },
    
    clearError: (state) => {
      state.error = null;
      state.errorTimestamp = null;
    },
    
    // Clear all maintenance data (on logout)
    clearMaintenance: (state) => {
      state.maintenanceRecords = [];
      state.selectedMaintenance = null;
      state.loading = false;
      state.error = null;
      state.errorTimestamp = null;
      state.filters = { status: 'all' };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch maintenance records
      .addCase(fetchMaintenanceRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(fetchMaintenanceRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.maintenanceRecords = action.payload;
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(fetchMaintenanceRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = getErrorMessage(action.payload);
        state.errorTimestamp = Date.now();
      })
      // Fetch maintenance by ID
      .addCase(fetchMaintenanceById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(fetchMaintenanceById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedMaintenance = action.payload;
        
        // Update in list if exists
        const index = state.maintenanceRecords.findIndex(
          (m) => m.id === action.payload.id
        );
        if (index !== -1) {
          state.maintenanceRecords[index] = action.payload;
        }
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(fetchMaintenanceById.rejected, (state, action) => {
        state.loading = false;
        state.error = getErrorMessage(action.payload);
        state.errorTimestamp = Date.now();
      })
      // Add to maintenance
      .addCase(addToMaintenanceThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(addToMaintenanceThunk.fulfilled, (state) => {
        state.loading = false;
        // Don't manually add the record here - the real-time listener will handle it
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(addToMaintenanceThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = getErrorMessage(action.payload);
        state.errorTimestamp = Date.now();
      })
      // Return from maintenance
      .addCase(returnFromMaintenanceThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(returnFromMaintenanceThunk.fulfilled, (state) => {
        state.loading = false;
        // Don't manually update the record here - the real-time listener will handle it
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(returnFromMaintenanceThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = getErrorMessage(action.payload);
        state.errorTimestamp = Date.now();
      })
      // Write off item
      .addCase(writeOffItemThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(writeOffItemThunk.fulfilled, (state) => {
        state.loading = false;
        // Don't manually update the record here - the real-time listener will handle it
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(writeOffItemThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = getErrorMessage(action.payload);
        state.errorTimestamp = Date.now();
      })
      // Add maintenance update
      .addCase(addMaintenanceUpdateThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(addMaintenanceUpdateThunk.fulfilled, (state) => {
        state.loading = false;
        // Don't manually update the record here - the real-time listener will handle it
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(addMaintenanceUpdateThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = getErrorMessage(action.payload);
        state.errorTimestamp = Date.now();
      });
  },
});

export const {
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
  clearMaintenance,
} = maintenanceSlice.actions;

export default maintenanceSlice.reducer;
