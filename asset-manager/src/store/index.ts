import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sitesReducer from './slices/sitesSlice';
import inventoryReducer from './slices/inventorySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sites: sitesReducer,
    inventory: inventoryReducer,
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
          'inventory/setItems',
          'inventory/addItem',
          'inventory/updateItemInState',
          'inventory/setCategories',
          'inventory/setInventoryForLocation',
          'inventory/fetchItems/fulfilled',
          'inventory/fetchItemById/fulfilled',
          'inventory/createItem/fulfilled',
          'inventory/updateItem/fulfilled',
          'inventory/fetchInventoryByLocation/fulfilled',
          'inventory/fetchCategories/fulfilled',
          'inventory/createCategory/fulfilled',
          'inventory/updateCategory/fulfilled',
        ],
        ignoredPaths: ['auth.user', 'sites.sites', 'inventory.items', 'inventory.categories', 'inventory.inventoryByLocation'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
