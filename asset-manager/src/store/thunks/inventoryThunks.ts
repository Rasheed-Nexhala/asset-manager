import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  listItems,
  getItemById as getItemByIdService,
  createItem as createItemService,
  updateItem as updateItemService,
  deleteItem as deleteItemService,
  adjustQuantity as adjustQuantityService,
  getInventoryByLocation,
} from '../../services/firebase/inventoryService';
import { logQuantityAdjustedToCloud } from '../../services/firebase/activityLogService';
import type { RootState } from '../index';
import {
  listCategories,
  createCategory as createCategoryService,
  updateCategory as updateCategoryService,
  deleteCategory as deleteCategoryService,
} from '../../services/firebase/categoryService';
import type {
  Item,
  Category,
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
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch items');
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
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch item');
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
    { itemData, categoryName }: { itemData: CreateItemData; categoryName: string },
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

      const itemId = await createItemService(dataWithAudit, categoryName);
      // Fetch the created item to return full data
      const createdItem = await getItemByIdService(itemId);
      if (!createdItem) {
        throw new Error('Failed to retrieve created item');
      }
      return createdItem;
    } catch (error: any) {
      // Handle Firestore permission-denied (SKU uniqueness rule violation)
      const code = error?.code ?? error?.error?.code;
      if (code === 'permission-denied') {
        return rejectWithValue(SKU_EXISTS_ERROR_MESSAGE);
      }
      // Handle service-level duplicate SKU error (checkSkuExists)
      if (
        error?.message?.includes('SKU') &&
        error?.message?.toLowerCase().includes('already exists')
      ) {
        return rejectWithValue(SKU_EXISTS_ERROR_MESSAGE);
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
    } catch (error: any) {
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
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete item');
    }
  }
);

/** Error when non-Admin attempts to add stock to central store */
const ADD_STOCK_ADMIN_ONLY_MESSAGE =
  'Only Admin can add stock to central store. Store Incharge can receive POs, transfer, or manage maintenance.';

/**
 * Adjust inventory quantity at a specific location
 * Add stock to central store is restricted to Admin only (Store Incharge can receive POs, transfer, maintenance)
 */
export const adjustQuantity = createAsyncThunk(
  'inventory/adjustQuantity',
  async (adjustmentData: AdjustmentData, { getState, rejectWithValue }) => {
    try {
      // Add stock to central store: Admin only (enforced at UI + thunk layer)
      if (
        adjustmentData.type === 'add' &&
        adjustmentData.locationType === 'store'
      ) {
        const state = getState() as RootState;
        const userRole = state.auth.userRole?.role;
        if (userRole !== 'Admin') {
          return rejectWithValue(ADD_STOCK_ADMIN_ONLY_MESSAGE);
        }
      }

      const { oldQuantity, newQuantity } = await adjustQuantityService(adjustmentData);

      const state = getState() as RootState;
      const { user, userRole } = state.auth;
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
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to adjust quantity');
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
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch inventory by location');
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
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch categories');
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
      // Fetch the created category to return full data
      const categories = await listCategories();
      const createdCategory = categories.find((cat) => cat.id === categoryId);
      if (!createdCategory) {
        throw new Error('Failed to retrieve created category');
      }
      return createdCategory;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create category');
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
      await updateCategoryService(categoryId, name);
      // Fetch the updated category to return full data
      const categories = await listCategories();
      const updatedCategory = categories.find((cat) => cat.id === categoryId);
      if (!updatedCategory) {
        throw new Error('Failed to retrieve updated category');
      }
      return updatedCategory;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update category');
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
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete category');
    }
  }
);
