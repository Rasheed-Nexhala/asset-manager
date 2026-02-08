import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sitesReducer from './slices/sitesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sites: sitesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'auth/setUser',
          'auth/signIn/fulfilled',
          'auth/signUp/fulfilled',
          'sites/setSites',
          'sites/addSite',
          'sites/updateSiteInState',
          'sites/fetchSites/fulfilled',
          'sites/createSite/fulfilled',
          'sites/updateSite/fulfilled',
        ],
        ignoredPaths: ['auth.user', 'sites.sites'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
