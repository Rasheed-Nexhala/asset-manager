import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  addToMaintenance as addToMaintenanceService,
  returnFromMaintenance as returnFromMaintenanceService,
  writeOffItem as writeOffItemService,
  listMaintenance,
  getMaintenanceById,
  addMaintenanceUpdate,
  updateMaintenancePhotos,
} from '../../services/firebase/maintenanceService';
import { uploadMaintenancePhoto } from '../../services/firebase/storageService';
import {
  AddToMaintenanceData,
  MaintenancePhoto,
  ReturnFromMaintenanceData,
  WriteOffData,
  MaintenanceStatus,
} from '../../types/maintenance';

/**
 * Fetch all maintenance records
 */
export const fetchMaintenanceRecords = createAsyncThunk(
  'maintenance/fetchRecords',
  async (filters: { status?: MaintenanceStatus | 'all' } | undefined, { rejectWithValue }) => {
    try {
      const records = await listMaintenance(filters);
      return records;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch maintenance records');
    }
  }
);

/**
 * Fetch single maintenance record
 */
export const fetchMaintenanceById = createAsyncThunk(
  'maintenance/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const record = await getMaintenanceById(id);
      if (!record) {
        throw new Error('Maintenance record not found');
      }
      return record;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch maintenance record');
    }
  }
);

/**
 * Add item to maintenance
 *
 * Creates the maintenance record first, then uploads any photoUris to Storage
 * and updates the record with photo metadata.
 */
export const addToMaintenanceThunk = createAsyncThunk(
  'maintenance/addToMaintenance',
  async (
    {
      data,
      userId,
      userName,
      photoUris,
    }: {
      data: AddToMaintenanceData;
      userId: string;
      userName: string;
      photoUris?: string[];
    },
    { rejectWithValue }
  ) => {
    try {
      const maintenanceId = await addToMaintenanceService(data, userId, userName);

      if (photoUris && photoUris.length > 0) {
        const photos: MaintenancePhoto[] = [];
        for (const uri of photoUris) {
          const { url, fileName } = await uploadMaintenancePhoto(uri, maintenanceId);
          photos.push({
            url,
            fileName,
            uploadedAt: new Date().toISOString(),
          });
        }
        await updateMaintenancePhotos(maintenanceId, photos);
      }

      return maintenanceId;
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Failed to add item to maintenance'
      );
    }
  }
);

/**
 * Return item from maintenance
 */
export const returnFromMaintenanceThunk = createAsyncThunk(
  'maintenance/returnFromMaintenance',
  async (
    {
      maintenanceId,
      returnData,
      userId,
      userName,
    }: {
      maintenanceId: string;
      returnData: ReturnFromMaintenanceData;
      userId: string;
      userName: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await returnFromMaintenanceService(maintenanceId, returnData, userId, userName);
      return maintenanceId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to return item from maintenance');
    }
  }
);

/**
 * Write off item
 */
export const writeOffItemThunk = createAsyncThunk(
  'maintenance/writeOffItem',
  async (
    {
      maintenanceId,
      writeOffData,
      userId,
      userName,
    }: {
      maintenanceId: string;
      writeOffData: WriteOffData;
      userId: string;
      userName: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await writeOffItemService(maintenanceId, writeOffData, userId, userName);
      return maintenanceId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to write off item');
    }
  }
);

/**
 * Add maintenance update note
 */
export const addMaintenanceUpdateThunk = createAsyncThunk(
  'maintenance/addUpdate',
  async (
    {
      maintenanceId,
      note,
      userId,
      userName,
    }: {
      maintenanceId: string;
      note: string;
      userId: string;
      userName: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await addMaintenanceUpdate(maintenanceId, note, userId, userName);
      return maintenanceId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add update');
    }
  }
);
