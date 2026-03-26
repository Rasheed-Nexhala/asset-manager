/**
 * Material transfer slip — React Native (Expo)
 * Same layout as web transferSlipPdfUtils; output via expo-print + expo-sharing (see poPdfUtils).
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';
import type { Timestamp } from 'firebase/firestore';
import type { Request } from '../types/request';
import { companyConfig } from '../../config/company';

/** Same loading strategy as poPdfUtils.loadLogoBase64 for consistent PDF rendering. */
async function loadLogoBase64(): Promise<string> {
  try {
    const [asset] = await Asset.loadAsync(require('../assets/images/IBF_logo.png'));
    let uri = asset.localUri ?? asset.uri ?? '';
    if (!uri) return '';

    const isAndroidRelease = Platform.OS === 'android' && !__DEV__;
    if (isAndroidRelease && uri && !uri.startsWith('file://')) {
      const cacheDir = FileSystem.cacheDirectory;
      if (cacheDir) {
        const destPath = `${cacheDir}IBF_logo_transfer_${Date.now()}.png`;
        try {
          await FileSystem.copyAsync({ from: uri, to: destPath });
          uri = destPath;
        } catch {
          // keep original uri
        }
      }
    }

    const result = await ImageManipulator.manipulateAsync(uri, [], {
      base64: true,
      format: ImageManipulator.SaveFormat.PNG,
    });
    return result.base64 ?? '';
  } catch {
    return '';
  }
}

function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

function timestampToMillis(ts: unknown): number {
  if (ts == null) return 0;
  if (typeof (ts as Timestamp).toMillis === 'function') {
    return (ts as Timestamp).toMillis();
  }
  return 0;
}

export function getTransferSlipDocumentId(request: Request): string {
  const reqNo = (request.requestNumber ?? request.id)
    .replace(/[^\w-]/g, '')
    .slice(0, 40);
  const ms = timestampToMillis(request.transferredAt);
  if (!ms) {
    return `TRF-${reqNo || 'REQ'}-PENDING`;
  }
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  const compact = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `TRF-${reqNo || 'REQ'}-${compact}`;
}

export function canPrintTransferSlip(request: Request | null | undefined): boolean {
  if (!request) return false;
  return (
    request.status === 'transferred' ||
    request.status === 'partially_returned' ||
    request.status === 'returned'
  );
}

function formatTransferredAt(ts: unknown): string {
  const ms = timestampToMillis(ts);
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateTransferSlipHtml(
  request: Request,
  logoBase64?: string
): string {
  const slipId = getTransferSlipDocumentId(request);
  const isSiteTransfer = request.requestType === 'site_transfer';
  const fromLabel = isSiteTransfer
    ? request.sourceSiteName ?? '—'
    : 'Central Store';
  const toLabel = request.siteName ?? '—';

  const logoImg = logoBase64
    ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" style="height: 56px; width: auto; display: block;" />`
    : '';

  const itemRows = (request.items ?? []).map((item, index) => {
    const slNo = index + 1;
    const qty = item.quantityApproved ?? item.quantityRequested ?? 0;
    const unit = escapeHtml(item.unit?.trim() || '—');
    return `
      <tr>
        <td style="padding: 6px 10px; border: 1px solid #000; font-size: 15px; text-align: center;">${slNo}</td>
        <td style="padding: 6px 10px; border: 1px solid #000; font-size: 15px;">${escapeHtml(item.itemName)}</td>
        <td style="padding: 6px 10px; border: 1px solid #000; font-size: 14px;">${escapeHtml(item.itemSku)}</td>
        <td style="padding: 6px 10px; border: 1px solid #000; font-size: 15px; text-align: center;">${escapeHtml(String(qty))}</td>
        <td style="padding: 6px 10px; border: 1px solid #000; font-size: 15px;">${unit}</td>
      </tr>`;
  }).join('');

  const movementTitle = isSiteTransfer ? 'Site-to-site transfer' : 'Central store → site';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #000; padding: 24px; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
    th, td { border: 1px solid #000; }
    th { background: #f0f0f0; font-size: 15px; font-weight: bold; padding: 10px 8px; text-align: center; }
    p { margin: 0; }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 6px;">
    <div style="font-size: 24px; font-weight: 900; color: #000; text-transform: uppercase;">${escapeHtml(companyConfig.name)}</div>
  </div>
  <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 24px; position: relative; min-height: 56px;">
    <div style="position: absolute; left: 0; top: 0;">${logoImg}</div>
    <div style="border: 3px solid #000; border-radius: 8px; padding: 8px 22px; background: #fff;">
      <div style="font-size: 18px; font-weight: 900; color: #000; letter-spacing: 0.5px;">MATERIAL TRANSFER SLIP</div>
    </div>
  </div>

  <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
    <div style="flex: 1; min-width: 160px; border: 2px solid #000; padding: 10px 14px;">
      <div style="font-size: 13px; font-weight: 900; color: #000;">Transfer slip no.</div>
      <div style="font-size: 16px; font-weight: 900; color: #000; margin-top: 4px;">${escapeHtml(slipId)}</div>
    </div>
    <div style="flex: 1; min-width: 160px; border: 2px solid #000; padding: 10px 14px;">
      <div style="font-size: 13px; font-weight: 900;">Material request ref.</div>
      <div style="font-size: 15px; font-weight: bold; margin-top: 4px;">${escapeHtml(request.requestNumber ?? '—')}</div>
    </div>
    <div style="flex: 1; min-width: 160px; border: 2px solid #000; padding: 10px 14px;">
      <div style="font-size: 13px; font-weight: 900;">Transfer date &amp; time</div>
      <div style="font-size: 15px; font-weight: bold; margin-top: 4px;">${escapeHtml(formatTransferredAt(request.transferredAt))}</div>
    </div>
  </div>

  <div style="border: 2px solid #000; padding: 12px; margin-bottom: 20px;">
    <p style="font-size: 13px; font-weight: 900; margin: 0 0 6px;">${escapeHtml(movementTitle)}</p>
    <p style="margin: 0 0 4px; font-size: 15px;"><span style="font-weight: 900;">From:</span> ${escapeHtml(fromLabel)}</p>
    <p style="margin: 0; font-size: 15px;"><span style="font-weight: 900;">To:</span> ${escapeHtml(toLabel)}</p>
    ${request.purpose?.trim() ? `<p style="margin: 8px 0 0; font-size: 14px;"><span style="font-weight: 900;">Purpose:</span> ${escapeHtml(request.purpose.trim())}</p>` : ''}
  </div>

  <p style="margin: 0 0 8px; font-size: 15px; font-weight: 900;">Items transferred</p>
  <table style="margin-bottom: 28px;">
    <thead>
      <tr>
        <th style="width: 48px;">Sl</th>
        <th>Item</th>
        <th style="width: 120px;">SKU</th>
        <th style="width: 72px;">Qty</th>
        <th style="width: 72px;">Unit</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div style="display: flex; gap: 32px; margin-top: 36px;">
    <div style="flex: 1;">
      <div style="height: 28px; border-bottom: 1px solid #000; margin-bottom: 6px;"></div>
      <p style="font-size: 14px; font-weight: bold; margin: 0;">Issued / transferred by</p>
      <p style="font-size: 15px; margin: 6px 0 0;">${escapeHtml(request.transferredByName ?? '—')}</p>
    </div>
    <div style="flex: 1;">
      <div style="height: 28px; border-bottom: 1px solid #000; margin-bottom: 6px;"></div>
      <p style="font-size: 14px; font-weight: bold; margin: 0;">Received by (at destination)</p>
      <p style="font-size: 15px; margin: 6px 0 0;">${escapeHtml(request.receivedByName ?? '—')}</p>
    </div>
  </div>

  <p style="margin-top: 32px; font-size: 12px; color: #333; line-height: 1.5;">
    This document is a record of material movement for material request <strong>${escapeHtml(request.requestNumber ?? '')}</strong>.
    Transfer slip number <strong>${escapeHtml(slipId)}</strong> is unique to this transfer event.
  </p>
</body>
</html>`;
}

/**
 * Renders HTML to PDF and opens the native share sheet (save / print / AirDrop).
 */
export async function printTransferSlip(request: Request): Promise<void> {
  if (!canPrintTransferSlip(request)) {
    throw new Error('Transfer slip is only available after items have been transferred.');
  }

  const logoBase64 = await loadLogoBase64();
  const html = generateTransferSlipHtml(request, logoBase64 || undefined);
  const printResult = await Print.printToFileAsync({
    html,
    width: 612,
    height: 792,
  });

  const uri = printResult.uri;
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Transfer slip ${getTransferSlipDocumentId(request)}`,
      UTI: '.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
