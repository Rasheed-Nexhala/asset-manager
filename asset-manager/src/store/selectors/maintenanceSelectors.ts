import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { Maintenance, MaintenanceStatus } from '../../types/maintenance';

// Base selector
export const selectMaintenanceState = (state: RootState) => state.maintenance;

// All maintenance records
export const selectMaintenanceRecords = (state: RootState) =>
  state.maintenance.maintenanceRecords;

// Selected maintenance record
export const selectSelectedMaintenance = (state: RootState) =>
  state.maintenance.selectedMaintenance;

// Loading state
export const selectMaintenanceLoading = (state: RootState) =>
  state.maintenance.loading;

// Error state
export const selectMaintenanceError = (state: RootState) =>
  state.maintenance.error;

// Filters
export const selectMaintenanceFilters = (state: RootState) =>
  state.maintenance.filters;

// Active maintenance records (pending, partial_return)
export const selectActiveMaintenanceRecords = createSelector(
  [selectMaintenanceRecords],
  (records) =>
    records.filter((record) =>
      ['pending', 'partial_return'].includes(record.status)
    )
);

/** Statuses that belong on the written-off register (disposal / partial disposal). */
const WRITTEN_OFF_REGISTER_STATUSES: MaintenanceStatus[] = [
  'written_off',
  'partially_returned_and_written_off',
];

// Written off records (strict terminal status only — used where full write-off count matters)
export const selectWrittenOffRecords = createSelector(
  [selectMaintenanceRecords],
  (records) => records.filter((record) => record.status === 'written_off')
);

/** Register list: all maintenance lines that include a write-off (including partial return + write-off). */
export const selectWrittenOffRegisterRecords = createSelector(
  [selectMaintenanceRecords],
  (records) =>
    records.filter((record) => WRITTEN_OFF_REGISTER_STATUSES.includes(record.status))
);

// Returned records
export const selectReturnedRecords = createSelector(
  [selectMaintenanceRecords],
  (records) => records.filter((record) => record.status === 'returned')
);

// History records (returned + written_off + partially_returned_and_written_off)
export const selectMaintenanceHistory = createSelector(
  [selectMaintenanceRecords],
  (records) =>
    records.filter((record) =>
      ['returned', 'written_off', 'partially_returned_and_written_off'].includes(record.status)
    )
);

// Factory selector: Get maintenance records by item ID
export const selectMaintenanceByItemId = (itemId: string) =>
  createSelector([selectMaintenanceRecords], (records) =>
    records.filter((record) => record.itemId === itemId)
  );

// Filtered records based on current filter
export const selectFilteredMaintenanceRecords = createSelector(
  [selectMaintenanceRecords, selectMaintenanceFilters],
  (records, filters) => {
    if (filters.status === 'all') {
      return records;
    }
    return records.filter((record) => record.status === filters.status);
  }
);

// Statistics
export const selectMaintenanceStats = createSelector(
  [selectMaintenanceRecords],
  (records) => {
    const active = records.filter((r) =>
      ['pending', 'partial_return'].includes(r.status)
    );
    const pending = records.filter((r) => r.status === 'pending');
    const partialReturn = records.filter((r) => r.status === 'partial_return');
    const writtenOff = records.filter((r) =>
      WRITTEN_OFF_REGISTER_STATUSES.includes(r.status)
    );

    return {
      total: records.length,
      active: active.length,
      pending: pending.length,
      partialReturn: partialReturn.length,
      writtenOff: writtenOff.length,
    };
  }
);

// Maintenance records by status (factory selector)
export const selectMaintenanceByStatus = (status: MaintenanceStatus) =>
  createSelector([selectMaintenanceRecords], (records) =>
    records.filter((record) => record.status === status)
  );

// Maintenance by ID (factory selector)
export const selectMaintenanceById = (maintenanceId: string) =>
  createSelector([selectMaintenanceRecords], (records) =>
    records.find((record) => record.id === maintenanceId) || null
  );
