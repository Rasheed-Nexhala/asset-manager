/** Normalize vehicle number for uniqueness checks (trim + lowercase). */
export function normalizeVehicleNumber(v: string): string {
  return v.trim().toLowerCase();
}

/** Client-side list search: case-insensitive match on number and notes. */
export function vehicleMatchesSearch(
  vehicle: { vehicleNumber: string; notes?: string | null },
  rawQuery: string
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const num = (vehicle.vehicleNumber ?? '').toLowerCase();
  const notes = (vehicle.notes ?? '').toLowerCase();
  return num.includes(q) || notes.includes(q);
}

export function filterVehiclesBySearch<T extends { vehicleNumber: string; notes?: string | null }>(
  vehicles: T[],
  rawQuery: string
): T[] {
  const q = rawQuery.trim();
  if (!q) return vehicles;
  return vehicles.filter((v) => vehicleMatchesSearch(v, q));
}
