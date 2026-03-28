/** Normalize vehicle number for uniqueness checks (trim + lowercase). */
export function normalizeVehicleNumber(v: string): string {
  return v.trim().toLowerCase();
}
