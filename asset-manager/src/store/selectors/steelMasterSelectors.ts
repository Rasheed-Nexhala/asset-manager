import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { SteelMaster } from '../../types/steelMaster';

const selectSteelMasterState = (state: RootState) => state.steelMaster;

export const selectAllSteelMasters = createSelector(
  [selectSteelMasterState],
  (steelMasterState) => steelMasterState.steelMasters
);

export const selectActiveSteelMasters = createSelector(
  [selectAllSteelMasters],
  (steelMasters) => steelMasters.filter((sm) => sm.isActive)
);

export const selectSteelMasterById = (id: string) =>
  createSelector(
    [selectAllSteelMasters],
    (steelMasters) => steelMasters.find((sm) => sm.id === id) || null
  );

export const selectSteelMasterLoading = createSelector(
  [selectSteelMasterState],
  (steelMasterState) => steelMasterState.loading
);

export const selectSteelMasterError = createSelector(
  [selectSteelMasterState],
  (steelMasterState) => steelMasterState.error
);

export const selectSelectedSteelMaster = createSelector(
  [selectSteelMasterState],
  (steelMasterState) => steelMasterState.selectedSteelMaster
);
