/**
 * CSV export - Web version
 * Uses Blob + URL.createObjectURL + <a download> for browser download.
 */

/**
 * Safely format a timestamp for CSV export.
 * Handles Firestore Timestamp, ISO string, Date, or plain {seconds, nanoseconds}.
 * Returns a readable date string or empty string if invalid.
 */
export function formatDateForCsv(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }
  const obj = value as {
    toDate?: () => Date;
    seconds?: number;
    nanoseconds?: number;
  };
  if (typeof obj.toDate === 'function') {
    const d = obj.toDate();
    return d && !Number.isNaN(d.getTime())
      ? d.toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
  }
  if (typeof obj.seconds === 'number') {
    const d = new Date(obj.seconds * 1000 + (obj.nanoseconds ?? 0) / 1e6);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }
  return '';
}

/**
 * Save CSV string and trigger browser download
 *
 * @param csvString - CSV content
 * @param filename - File name without extension (default: 'export')
 */
export async function saveCsvAndShare(
  csvString: string,
  filename: string = 'export'
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}-${timestamp}.csv`;
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fullFilename;
  a.click();
  URL.revokeObjectURL(url);
}
