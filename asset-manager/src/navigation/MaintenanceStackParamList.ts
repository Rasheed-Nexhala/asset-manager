/**
 * Navigation parameter types for Maintenance Stack
 */
export type MaintenanceStackParamList = {
  MaintenanceDashboard: undefined;
  AddToMaintenance: undefined;
  MaintenanceDetail: { maintenanceId: string };
  ReturnFromMaintenance: { maintenanceId: string };
  WriteOff: { maintenanceId: string };
};
