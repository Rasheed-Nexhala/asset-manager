import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  listItems,
  getItemById as getItemByIdService,
  createItem as createItemService,
  updateItem as updateItemService,
  adjustQuantity as adjustQuantityService,
  getInventoryByLocation,
} from '../../services/firebase/inventoryService';
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

/**
 * Create a new item
 */
export const createItem = createAsyncThunk(
  'inventory/createItem',
  async (
    { itemData, categoryName }: { itemData: CreateItemData; categoryName: string },
    { rejectWithValue }
  ) => {
    try {
      const itemId = await createItemService(itemData, categoryName);
      // Fetch the created item to return full data
      const createdItem = await getItemByIdService(itemId);
      if (!createdItem) {
        throw new Error('Failed to retrieve created item');
      }
      return createdItem;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create item');
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
    { rejectWithValue }
  ) => {
    try {
      await updateItemService(itemId, updates, categoryName);
      // Fetch the updated item to return full data
      const updatedItem = await getItemByIdService(itemId);
      if (!updatedItem) {
        throw new Error('Failed to retrieve updated item');
      }
      return updatedItem;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update item');
    }
  }
);

/**
 * Adjust inventory quantity at a specific location
 */
export const adjustQuantity = createAsyncThunk(
  'inventory/adjustQuantity',
  async (adjustmentData: AdjustmentData, { rejectWithValue }) => {
    try {
      await adjustQuantityService(adjustmentData);
      // Return the location ID and item ID for potential state updates
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
