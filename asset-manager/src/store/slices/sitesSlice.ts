import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Site } from '../../types/sites';
import { fetchSites, createSite, updateSite } from '../thunks/sitesThunks';

interface SitesState {
  sites: Site[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
}

const initialState: SitesState = {
  sites: [],
  isLoading: false,
  error: null,
  searchQuery: '',
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
        state.error = action.payload as string;
      })
      // Create site
      .addCase(createSite.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSite.fulfilled, (state) => {
        state.isLoading = false;
        // Don't manually add the site here - the real-time listener will handle it
        // to avoid duplicate entries when subscribeToSites triggers
        state.error = null;
      })
      .addCase(createSite.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update site
      .addCase(updateSite.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSite.fulfilled, (state) => {
        state.isLoading = false;
        // Don't manually update the site here - the real-time listener will handle it
        // to ensure consistency and avoid race conditions
        state.error = null;
      })
      .addCase(updateSite.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
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
} = sitesSlice.actions;

export { fetchSites, createSite, updateSite } from '../thunks/sitesThunks';
export default sitesSlice.reducer;
