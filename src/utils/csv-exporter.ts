import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Paths, File } from 'expo-file-system';

/**
 * Downloads / shares a CSV string to the user's device or browser.
 * - On Web: Creates a Blob and initiates a browser file download.
 * - On Native (Android / iOS): Writes to the document directory and triggers
 *   the system share sheet / save dialog via expo-sharing.
 *
 * Uses the expo-file-system v58+ new `File` / `Paths` API.
 */
export async function downloadAndShareCsv(filename: string, csvContent: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    return;
  }

  // Native iOS / Android — use the new expo-file-system File class
  const docDir = Paths.document;
  const file = new File(docDir, filename);

  // Write content (UTF-8)
  await file.write(csvContent);

  // Open native share sheet
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: `Export ${filename}`,
      UTI: 'public.comma-separated-values-text',
    });
  }
}
