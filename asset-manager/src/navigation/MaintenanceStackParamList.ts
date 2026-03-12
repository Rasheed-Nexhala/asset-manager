import type { Item } from '../types/inventory';

/**
 * Navigation parameter types for Maintenance Stack
 */
export type MaintenanceStackParamList = {
  MaintenanceDashboard: undefined;
  AddToMaintenance: { selectedItem?: Item } | undefined;
  SelectItemForMaintenance: {
    selectedItemId?: string;
    excludeItemIds?: string[];
  };
  MaintenanceDetail: { maintenanceId: string };
  ReturnFromMaintenance: { maintenanceId: string };
  WriteOff: { maintenanceId: string };
};
