/**
 * Date serialization utilities for Redux state.
 *
 * Redux requires state to be serializable. Date objects are NOT serializable.
 * Store dates as ISO 8601 strings in Redux; convert to Date for UI and services.
 */

/** Filters with date fields as Date (UI) or string (store) */
type FiltersWithDates<T> = {
  startDate?: T | null;
  endDate?: T | null;
};

/**
 * Convert Date to ISO 8601 string for Redux storage.
 */
export function dateToIso(date: Date | string | null | undefined): string | null {
  if (date == null) return null;
  if (typeof date === 'string') return date;
  return date instanceof Date ? date.toISOString() : null;
}

/**
 * Convert ISO string (or Date) to Date for UI/service use.
 */
export function isoToDate(iso: string | Date | null | undefined): Date | null {
  if (iso == null) return null;
  if (iso instanceof Date) return iso;
  if (typeof iso !== 'string') return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Convert UI filters (Date) to store format (ISO string) before dispatching.
 */
export function filtersToStore<T extends FiltersWithDates<Date>>(
  filters: Partial<T>
): { startDate: string | null; endDate: string | null } & Omit<Partial<T>, 'startDate' | 'endDate'> {
  const { startDate, endDate, ...rest } = filters;
  return {
    ...rest,
    startDate: dateToIso(startDate),
    endDate: dateToIso(endDate),
  } as { startDate: string | null; endDate: string | null } & Omit<Partial<T>, 'startDate' | 'endDate'>;
}

/**
 * Convert store filters (ISO string) to UI format (Date) for DateTimePicker.
 */
export function filtersToUI<T extends FiltersWithDates<string>>(
  filters: Partial<T>
): { startDate: Date | null; endDate: Date | null } & Omit<Partial<T>, 'startDate' | 'endDate'> {
  const { startDate, endDate, ...rest } = filters;
  return {
    ...rest,
    startDate: isoToDate(startDate),
    endDate: isoToDate(endDate),
  } as { startDate: Date | null; endDate: Date | null } & Omit<Partial<T>, 'startDate' | 'endDate'>;
}
