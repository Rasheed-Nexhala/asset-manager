import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Site } from '../../types/sites';
import { fetchSites, createSite, updateSite } from '../thunks/sitesThunks';
import { sanitizeForDisplay } from '../../utils/sanitizeUtils';
import {
  cleanupManagerAssignments,
  validateAllManagerAssignments,
} from '../thunks/managerValidationThunks';

interface SitesState {
  sites: Site[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  validationLoading: boolean;
  lastValidationAt: string | null;
}

const initialState: SitesState = {
  sites: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  validationLoading: false,
  lastValidationAt: null,
};

const sitesSlice = createSlice({
  name: 'sites',
  initialState,
  reducers: {
    setSites: (state, action: PayloadAction<Site[]>) => {
      state.sites = action.payload;
    },
    addSite: (state, action: PayloadAction<Site>) => {
      state.sites.push(action.payload);
    },
    updateSiteInState: (state, action: PayloadAction<Site>) => {
      const index = state.sites.findIndex((site) => site.id === action.payload.id);
      if (index !== -1) {
        state.sites[index] = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    /** Reset sites state (e.g. on sign-out) */
    clearSites: (state) => {
      state.sites = [];
      state.isLoading = false;
      state.error = null;
      state.searchQuery = '';
      state.validationLoading = false;
      state.lastValidationAt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch sites
      .addCase(fetchSites.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSites.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sites = action.payload;
        state.error = null;
      })
      .addCase(fetchSites.rejected, (state, action) => {
        state.isLoading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
      })
      // Create site
      .addCase(createSite.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSite.fulfilled, (state, action) => {
        state.isLoading = false;
        // Optimistic update to prevent stale data when navigating back
        const exists = state.sites.some((site) => site.id === action.payload.id);
        if (!exists) {
          state.sites.push(action.payload);
        }
        state.error = null;
      })
      .addCase(createSite.rejected, (state, action) => {
        state.isLoading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
      })
      // Update site
      .addCase(updateSite.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSite.fulfilled, (state, action) => {
        state.isLoading = false;
        // Optimistic update to prevent stale data when navigating back
        const index = state.sites.findIndex((site) => site.id === action.payload.id);
        if (index !== -1) {
          state.sites[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateSite.rejected, (state, action) => {
        state.isLoading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
      })
      // Cleanup manager assignments
      .addCase(cleanupManagerAssignments.pending, (state) => {
        state.validationLoading = true;
      })
      .addCase(cleanupManagerAssignments.fulfilled, (state, action) => {
        state.validationLoading = false;
        state.lastValidationAt = new Date().toISOString();
        // Log cleanup result for debugging
        if (action.payload.sitesUpdated > 0) {
          console.log(
            `Cleaned up ${action.payload.sitesUpdated} site(s) for manager ${action.payload.managerId}`
          );
        }
      })
      .addCase(cleanupManagerAssignments.rejected, (state, action) => {
        state.validationLoading = false;
        console.error('Manager cleanup failed:', action.payload);
      })
      // Validate all manager assignments
      .addCase(validateAllManagerAssignments.pending, (state) => {
        state.validationLoading = true;
      })
      .addCase(validateAllManagerAssignments.fulfilled, (state, action) => {
        state.validationLoading = false;
        state.lastValidationAt = new Date().toISOString();
        // Log validation result for debugging
        if (action.payload.sitesUpdated > 0) {
          console.log(
            `Validated all sites: ${action.payload.sitesUpdated} site(s) cleaned up, ${action.payload.managersCleaned.length} manager(s) affected`
          );
        }
      })
      .addCase(validateAllManagerAssignments.rejected, (state, action) => {
        state.validationLoading = false;
        console.error('Validation failed:', action.payload);
      });
  },
});

export const {
  setSites,
  addSite,
  updateSiteInState,
  setLoading,
  setError,
  setSearchQuery,
  clearError,
  clearSites,
} = sitesSlice.actions;

export { fetchSites, createSite, updateSite } from '../thunks/sitesThunks';
export default sitesSlice.reducer;
