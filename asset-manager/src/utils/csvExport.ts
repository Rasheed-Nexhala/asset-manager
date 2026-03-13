import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Safely format a timestamp for CSV export.
 * Handles Firestore Timestamp, ISO string, Date, or plain {seconds, nanoseconds}.
 * Returns a readable date string or empty string if invalid.
 */
export function formatDateForCsv(
  value: unknown
): string {
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
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  const obj = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
  if (typeof obj.toDate === 'function') {
    const d = obj.toDate();
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : '';
  }
  if (typeof obj.seconds === 'number') {
    const d = new Date(obj.seconds * 1000 + (obj.nanoseconds ?? 0) / 1e6);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', {
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
 * Save CSV string to device and share via native share dialog
 *
 * @param csvString - CSV content
 * @param filename - File name without extension (default: 'export')
 */
export async function saveCsvAndShare(
  csvString: string,
  filename: string = 'export'
): Promise<void> {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}-${timestamp}.csv`;
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      throw new Error('Document directory is not available');
    }
    const fileUri = `${documentDir}${fullFilename}`;

    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Activity Logs',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error saving/sharing CSV:', err);

    if (
      err.message?.includes('expo-file-system') ||
      err.message?.includes('expo-sharing') ||
      err.message?.includes('Cannot find module')
    ) {
      throw new Error(
        'CSV export requires expo-file-system and expo-sharing. Install with: npx expo install expo-file-system expo-sharing'
      );
    }

    throw new Error(err.message ?? 'Failed to export CSV');
  }
}
