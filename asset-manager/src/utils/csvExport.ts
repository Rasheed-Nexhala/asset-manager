import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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
    const fileUri = `${FileSystem.documentDirectory}${fullFilename}`;

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
