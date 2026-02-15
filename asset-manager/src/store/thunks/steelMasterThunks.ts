import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  listSteelMasters,
  getSteelMasterById as getSteelMasterByIdService,
  createSteelMaster as createSteelMasterService,
  updateSteelMaster as updateSteelMasterService,
  deleteSteelMaster as deleteSteelMasterService,
} from '../../services/firebase/steelMasterService';
import type {
  SteelMaster,
  CreateSteelMasterData,
  UpdateSteelMasterData,
} from '../../types/steelMaster';

/**
 * Fetch steel masters with optional active-only filter
 */
export const fetchSteelMasters = createAsyncThunk<
  SteelMaster[],
  boolean | undefined
>(
  'steelMaster/fetchSteelMasters',
  async (activeOnly, { rejectWithValue }) => {
    try {
      const steelMasters = await listSteelMasters(activeOnly ?? false);
      return steelMasters;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch steel masters';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch a single steel master by ID
 */
export const fetchSteelMasterById = createAsyncThunk(
  'steelMaster/fetchSteelMasterById',
  async (id: string, { rejectWithValue }) => {
    try {
      const steelMaster = await getSteelMasterByIdService(id);
      if (!steelMaster) {
        return rejectWithValue(`Steel master with ID ${id} not found`);
      }
      return steelMaster;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch steel master';
      return rejectWithValue(message);
    }
  }
);

/**
 * Create a new steel master
 */
export const createSteelMaster = createAsyncThunk(
  'steelMaster/createSteelMaster',
  async (data: CreateSteelMasterData, { rejectWithValue }) => {
    try {
      const id = await createSteelMasterService(data);
      const created = await getSteelMasterByIdService(id);
      if (!created) {
        throw new Error('Failed to retrieve created steel master');
      }
      return created;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create steel master';
      return rejectWithValue(message);
    }
  }
);

/**
 * Update an existing steel master
 */
export const updateSteelMaster = createAsyncThunk(
  'steelMaster/updateSteelMaster',
  async (
    { id, updates }: { id: string; updates: UpdateSteelMasterData },
    { rejectWithValue }
  ) => {
    try {
      await updateSteelMasterService(id, updates);
      const updated = await getSteelMasterByIdService(id);
      if (!updated) {
        throw new Error('Failed to retrieve updated steel master');
      }
      return updated;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update steel master';
      return rejectWithValue(message);
    }
  }
);

/**
 * Delete (soft delete) a steel master
 */
export const deleteSteelMaster = createAsyncThunk(
  'steelMaster/deleteSteelMaster',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteSteelMasterService(id);
      return id;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete steel master';
      return rejectWithValue(message);
    }
  }
);
