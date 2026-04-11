import type { DocumentSnapshot } from 'firebase/firestore';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { saveCsvAndShare } from '../../utils/csvExport';
import {
  listItems,
  listItemsPaginated,
  getItemsCount,
  ITEMS_PAGE_SIZE,
  getItemById as getItemByIdService,
  createItem as createItemService,
  updateItem as updateItemService,
  deleteItem as deleteItemService,
  adjustQuantity as adjustQuantityService,
  getInventoryByLocation,
} from '../../services/firebase/inventoryService';
import { logQuantityAdjustedToCloud } from '../../services/firebase/activityLogService';
import { mapFirestoreErrorToUserMessage } from '../../utils/firestoreErrorUtils';
import type { RootState } from '../index';
import {
  listCategories,
  createCategory as createCategoryService,
  updateCategory as updateCategoryService,
  deleteCategory as deleteCategoryService,
  getCategoryById as getCategoryByIdService,
} from '../../services/firebase/categoryService';
import type {
  Item,
  InventoryEntry,
  CreateItemData,
  UpdateItemData,
  AdjustmentData,
  ItemFilters,
} from '../../types/inventory';

/**
 * Fetch items with optional filters
 */
export const fetchItems = createAsyncThunk(
  'inventory/fetchItems',
  async (filters: ItemFilters | undefined, { rejectWithValue }) => {
    try {
      const items = await listItems(filters);
      return items;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch items';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Fetch items with pagination (first page) and total count.
 * Runs getItemsCount and listItemsPaginated in parallel.
 */
export const fetchItemsPaginated = createAsyncThunk(
  'inventory/fetchItemsPaginated',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const filters = state.inventory.filters ?? undefined;

      const [countResult, listResult] = await Promise.all([
        getItemsCount(filters),
        listItemsPaginated(filters, ITEMS_PAGE_SIZE),
      ]);

      return {
        items: listResult.items,
        totalCount: countResult,
        lastDoc: listResult.lastDoc,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch items';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Load next page of items (append to existing).
 */
export const loadMoreItems = createAsyncThunk(
  'inventory/loadMoreItems',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { filters, lastDoc } = state.inventory;

      if (!lastDoc) {
        return { items: [], lastDoc: null };
      }

      const result = await listItemsPaginated(
        filters ?? undefined,
        ITEMS_PAGE_SIZE,
        lastDoc as DocumentSnapshot
      );

      return {
        items: result.items,
        lastDoc: result.lastDoc,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load more items';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Fetch a single item by ID
 */
export const fetchItemById = createAsyncThunk(
  'inventory/fetchItemById',
  async (itemId: string, { rejectWithValue }) => {
    try {
      const item = await getItemByIdService(itemId);
      if (!item) {
        return rejectWithValue(`Item with ID ${itemId} not found`);
      }
      return item;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch item';
      return rejectWithValue(errorMessage);
    }
  }
);

/** User-friendly message when SKU already exists (security rule or service check) */
export const SKU_EXISTS_ERROR_MESSAGE =
  'This SKU already exists. Please use a different SKU.';

/**
 * Create a new item
 */
export const createItem = createAsyncThunk(
  'inventory/createItem',
  async (
    { itemData, categoryName }: { itemData: CreateItemData; categoryName?: string | null },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const { user, userRole } = state.auth;
      const userId = user?.uid ?? null;
      const userName = user?.displayName ?? user?.email ?? 'Unknown';
      const userRoleType = userRole?.role ?? 'Admin';

      const dataWithAudit: CreateItemData = {
        ...itemData,
        createdBy: userId ?? undefined,
        createdByName: userId ? userName : undefined,
        createdByRole: userId ? userRoleType : undefined,
      };

      const itemId = await createItemService(dataWithAudit, categoryName ?? undefined);
      // Fetch the created item to return full data
      const createdItem = await getItemByIdService(itemId);
      if (!createdItem) {
        throw new Error('Failed to retrieve created item');
      }
      return createdItem;
    } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      // Handle service-level duplicate SKU error (checkSkuExists throws before Firestore)
      if (
        error?.message?.includes('SKU') &&
        error?.message?.toLowerCase().includes('already exists')
      ) {
        return rejectWithValue(SKU_EXISTS_ERROR_MESSAGE);
      }
      // Permission-denied can mean: missing skus rules, user not Admin/StoreIncharge, or duplicate SKU (Firestore rule).
      // Show the actual permission message instead of assuming "SKU exists".
      const code = error?.code ?? error?.error?.code;
      if (code === 'permission-denied') {
        return rejectWithValue(
          mapFirestoreErrorToUserMessage(error, 'Failed to create item')
        );
      }
      return rejectWithValue(error?.message || 'Failed to create item');
    }
  }
);

/**
 * Update an existing item
 */
export const updateItem = createAsyncThunk(
  'inventory/updateItem',
  async (
    {
      itemId,
      updates,
      categoryName,
    }: { itemId: string; updates: UpdateItemData; categoryName?: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const { user, userRole } = state.auth;
      const userId = user?.uid ?? null;
      const userName = user?.displayName ?? user?.email ?? 'Unknown';
      const userRoleType = userRole?.role ?? 'Admin';

      const updatesWithAudit: UpdateItemData = {
        ...updates,
        updatedBy: userId ?? undefined,
        updatedByName: userId ? userName : undefined,
        updatedByRole: userId ? userRoleType : undefined,
      };

      await updateItemService(itemId, updatesWithAudit, categoryName);
      // Fetch the updated item to return full data
      const updatedItem = await getItemByIdService(itemId);
      if (!updatedItem) {
        throw new Error('Failed to retrieve updated item');
      }
      return updatedItem;
    } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      // Handle duplicate SKU error (same as createItem)
      if (
        error?.message?.includes('SKU') &&
        error?.message?.toLowerCase().includes('already exists')
      ) {
        return rejectWithValue(SKU_EXISTS_ERROR_MESSAGE);
      }
      return rejectWithValue(error.message || 'Failed to update item');
    }
  }
);

/**
 * Delete an item (and clean up associated images and inventory entries)
 */
export const deleteItem = createAsyncThunk(
  'inventory/deleteItem',
  async (itemId: string, { rejectWithValue }) => {
    try {
      await deleteItemService(itemId);
      return itemId;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete item';
      return rejectWithValue(errorMessage);
    }
  }
);

/** Error when Store Incharge lacks Admin approval to update central store */
const STORE_INCHARGE_ACCESS_REQUIRED_MESSAGE =
  'You need Admin approval to update inventory. Request access first.';

/** Error when role is still loading */
const ROLE_LOADING_MESSAGE =
  'Loading your role. Please wait a moment and try again.';

/** Error when role could not be loaded */
const ROLE_NOT_LOADED_MESSAGE =
  'Your role could not be loaded. Please sign out and sign in again.';

/**
 * Adjust inventory quantity at a specific location.
 * Admin: can always adjust. Store Incharge: only when myAccessGrantedUntil > now.
 */
export const adjustQuantity = createAsyncThunk(
  'inventory/adjustQuantity',
  async (adjustmentData: AdjustmentData, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { user, userRole, isRoleLoading } = state.auth;
      const roleType = userRole?.role;

      // Pre-flight: ensure role is loaded before attempting adjustment
      if (user && isRoleLoading) {
        return rejectWithValue(ROLE_LOADING_MESSAGE);
      }
      if (user && !isRoleLoading && roleType == null) {
        return rejectWithValue(ROLE_NOT_LOADED_MESSAGE);
      }

      // Central store update: Admin has full access; Store Incharge needs approved access
      if (adjustmentData.locationType === 'store') {
        if (roleType === 'Admin') {
          // Admin: no access check
        } else if (roleType === 'StoreIncharge') {
          const myAccessGrantedUntil =
            state.inventoryUpdateRequest.myAccessGrantedUntil ?? null;
          const now = new Date();
          const expiry = myAccessGrantedUntil ? new Date(myAccessGrantedUntil) : null;
          if (!expiry || expiry <= now) {
            return rejectWithValue(STORE_INCHARGE_ACCESS_REQUIRED_MESSAGE);
          }
        }
        // Other roles (e.g. SiteManager) cannot update central store - Firestore rules enforce
      }

      const { oldQuantity, newQuantity } = await adjustQuantityService(adjustmentData);

      const userName = user?.displayName ?? user?.email ?? 'Unknown';
      const userRoleType = userRole?.role ?? 'Unassigned';

      void logQuantityAdjustedToCloud({
        itemId: adjustmentData.itemId,
        itemName: adjustmentData.itemName,
        itemSku: adjustmentData.itemSku,
        locationId: adjustmentData.locationId,
        locationName: adjustmentData.locationName,
        type: adjustmentData.type,
        quantity: adjustmentData.quantity,
        reason: adjustmentData.reason,
        notes: adjustmentData.notes,
        oldQuantity,
        newQuantity,
        userName,
        userRole: userRoleType,
      });

      return {
        itemId: adjustmentData.itemId,
        locationId: adjustmentData.locationId,
      };
    } catch (error: unknown) {
      const userMessage = mapFirestoreErrorToUserMessage(
        error,
        'Failed to adjust quantity'
      );
      return rejectWithValue(userMessage);
    }
  }
);

/**
 * Fetch inventory for a specific location
 */
export const fetchInventoryByLocation = createAsyncThunk(
  'inventory/fetchInventoryByLocation',
  async (locationId: string, { rejectWithValue }) => {
    try {
      const inventory = await getInventoryByLocation(locationId);
      return {
        locationId,
        inventory,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch inventory by location';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Fetch all categories
 */
export const fetchCategories = createAsyncThunk(
  'inventory/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const categories = await listCategories();
      return categories;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Create a new category
 */
export const createCategory = createAsyncThunk(
  'inventory/createCategory',
  async (name: string, { rejectWithValue }) => {
    try {
      const categoryId = await createCategoryService(name);
      // Fetch the created category to return full data using ID to bypass query cache
      const createdCategory = await getCategoryByIdService(categoryId);
      if (!createdCategory) {
        throw new Error('Failed to retrieve created category');
      }
      return createdCategory;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update an existing category
 */
export const updateCategory = createAsyncThunk(
  'inventory/updateCategory',
  async ({ categoryId, name }: { categoryId: string; name: string }, { rejectWithValue }) => {
    try {
      const newCategoryId = await updateCategoryService(categoryId, name);
      // Fetch the updated category to return full data using new ID
      const updatedCategory = await getCategoryByIdService(newCategoryId);
      if (!updatedCategory) {
        throw new Error('Failed to retrieve updated category');
      }
      return updatedCategory;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Delete a category
 */
export const deleteCategory = createAsyncThunk(
  'inventory/deleteCategory',
  async (categoryId: string, { rejectWithValue }) => {
    try {
      await deleteCategoryService(categoryId);
      return categoryId;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Export inventory to CSV
 */
export const exportInventoryThunk = createAsyncThunk(
  'inventory/export',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { filters } = state.inventory;
      
      const items = await listItems(filters ?? undefined);
      
      const header = 'Item Name,SKU,Category,Type,Unit,Total Quantity,Central Store Quantity,Site Quantity,Maintenance Quantity,Status\n';
      
      const escapeCsvField = (value: string | number | null | undefined): string =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;

      const rows = items.map(item => {
        return [
          item.name,
          item.sku,
          item.categoryName || 'Uncategorized',  // Handle null categoryName
          item.type,
          item.unit,
          item.totalQuantity,
          item.centralStoreQuantity,
          item.atSitesQuantity,
          item.inMaintenanceQuantity,
          item.status
        ].map(escapeCsvField).join(',');
      }).join('\n');

      await saveCsvAndShare(header + rows, 'inventory');
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export inventory';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Export site inventory to CSV
 */
export const exportSiteInventoryThunk = createAsyncThunk(
  'inventory/exportSite',
  async (
    {
      siteName,
      inventoryEntries,
    }: {
      locationId: string;
      siteName: string;
      inventoryEntries: {
        entry: InventoryEntry;
        item?: Item;
        type: string;
        unit: string;
      }[];
    },
    { rejectWithValue }
  ) => {
    try {
      const header = 'Item Name,SKU,Category,Type,Unit,System Quantity,Physical Count,Variance\n';

      const escapeCsvField = (value: string | number | null | undefined): string =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;

      const rows = inventoryEntries
        .map(({ entry, item, type, unit }) => {
          return [
            entry?.itemName,
            entry?.itemSku,
            item?.categoryName || 'Uncategorized',
            type,
            unit,
            entry?.quantity,
            '', // Physical Count
            '', // Variance
          ]
            .map(escapeCsvField)
            .join(',');
        })
        .join('\n');

      const fileName = `inventory_${siteName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      await saveCsvAndShare(header + rows, fileName);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export site inventory';
      return rejectWithValue(errorMessage);
    }
  }
);
