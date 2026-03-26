import type { Maintenance } from '../types/maintenance';

const WRITTEN_OFF_REGISTER_STATUSES = new Set([
  'written_off',
  'partially_returned_and_written_off',
]);

/** Matches system-generated write-off notes from maintenanceService. */
const WRITTEN_OFF_NOTE_RE = /^Written off (\d+) items\./;

/**
 * Cumulative units written off for this maintenance line.
 * Prefers `writtenOffUnitsTotal` from Firestore; for older records, sums matching update notes.
 */
export function getDisplayWrittenOffUnits(maintenance: Maintenance): number | null {
  if (typeof maintenance.writtenOffUnitsTotal === 'number') {
    return maintenance.writtenOffUnitsTotal;
  }
  let sum = 0;
  let found = false;
  for (const u of maintenance.updates || []) {
    const m = typeof u.note === 'string' ? u.note.match(WRITTEN_OFF_NOTE_RE) : null;
    if (m) {
      sum += parseInt(m[1], 10);
      found = true;
    }
  }
  return found ? sum : null;
}

export function isWrittenOffRegisterStatus(status: Maintenance['status']): boolean {
  return WRITTEN_OFF_REGISTER_STATUSES.has(status);
}
