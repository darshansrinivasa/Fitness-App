import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  exportToChatGpt,
  exportToJson,
  exportToMarkdown,
  exportToPdfHtml,
  type ExportFormat,
  type LifestyleExport,
} from '@lifestyle-os/shared';

export async function shareExport(data: LifestyleExport, format: ExportFormat): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  let uri: string;
  let mimeType: string;

  if (format === 'pdf') {
    const html = exportToPdfHtml(data);
    const pdf = await Print.printToFileAsync({ html });
    uri = pdf.uri;
    mimeType = 'application/pdf';
  } else {
    let contents: string;
    let ext: string;
    if (format === 'json') {
      contents = exportToJson(data);
      ext = 'json';
      mimeType = 'application/json';
    } else if (format === 'chatgpt') {
      contents = exportToChatGpt(data);
      ext = 'json';
      mimeType = 'application/json';
    } else {
      contents = exportToMarkdown(data);
      ext = 'md';
      mimeType = 'text/plain';
    }
    const path = `${FileSystem.cacheDirectory}lifestyle-export-${stamp}.${ext}`;
    await FileSystem.writeAsStringAsync(path, contents);
    uri = path;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Export Lifestyle OS data' });
}
