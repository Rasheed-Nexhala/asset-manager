import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sitesReducer from './slices/sitesSlice';
import inventoryReducer from './slices/inventorySlice';
import requestsReducer from './slices/requestsSlice';
import steelMasterReducer from './slices/steelMasterSlice';
import maintenanceReducer from './slices/maintenanceSlice';
import activityLogReducer from './slices/activityLogSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sites: sitesReducer,
    inventory: inventoryReducer,
    requests: requestsReducer,
    steelMaster: steelMasterReducer,
    maintenance: maintenanceReducer,
    activityLog: activityLogReducer,
  },
  //Todo: Fix serializableCheck
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
          'requests/setRequests',
          'requests/setMyRequests',
          'requests/setSelectedRequest',
          'requests/addRequest',
          'requests/updateRequestInState',
          'requests/createRequest/fulfilled',
          'requests/editRequest/fulfilled',
          'requests/submitDraftRequest/fulfilled',
          'requests/approveRequest/fulfilled',
          'requests/rejectRequest/fulfilled',
          'requests/transferRequest/fulfilled',
          'requests/returnItems/fulfilled',
          'requests/cancelRequest/fulfilled',
          'steelMaster/fetchSteelMasters/fulfilled',
          'steelMaster/fetchSteelMasterById/fulfilled',
          'steelMaster/createSteelMaster/fulfilled',
          'steelMaster/updateSteelMaster/fulfilled',
          'steelMaster/deleteSteelMaster/fulfilled',
          'maintenance/setMaintenanceRecords',
          'maintenance/addMaintenanceRecord',
          'maintenance/updateMaintenanceInState',
          'maintenance/fetchRecords/fulfilled',
          'maintenance/fetchById/fulfilled',
          'maintenance/addToMaintenance/fulfilled',
          'maintenance/returnFromMaintenance/fulfilled',
          'maintenance/writeOffItem/fulfilled',
          'maintenance/addUpdate/fulfilled',
          'activityLog/fetchLogs/fulfilled',
          'activityLog/loadMore/fulfilled',
          'activityLog/fetchMyActivity/fulfilled',
        ],
        ignoredPaths: [
          'auth.user',
          'sites.sites',
          'inventory.items',
          'inventory.categories',
          'inventory.inventoryByLocation',
          'requests.requests',
          'requests.myRequests',
          'requests.selectedRequest',
          'steelMaster.steelMasters',
          'steelMaster.selectedSteelMaster',
          'maintenance.maintenanceRecords',
          'maintenance.selectedMaintenance',
          'activityLog.logs',
          'activityLog.myRecentActivity',
          'activityLog.lastDoc',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
