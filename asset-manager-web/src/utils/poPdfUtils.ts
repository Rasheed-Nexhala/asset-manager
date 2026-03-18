/**
 * PO PDF utilities - Web version
 * Uses window.print() with generated HTML. Logo embedded as base64 for reliable print rendering.
 */
import type { PurchaseOrder, PurchaseOrderItem } from '../types/purchaseOrder';
import { companyConfig } from '../config/company';

/** Load company logo as data URL for embedding in PDF HTML. Returns empty string on failure. */
async function loadLogoDataUrl(): Promise<string> {
  try {
    const url = `${window.location.origin}${companyConfig.logoPath}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) ?? '');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

/** Wait for all images in the document to load before printing. */
function waitForImages(win: Window, timeoutMs = 3000): Promise<void> {
  const doc = win.document;
  const images = Array.from(doc.images);
  if (images.length === 0) return Promise.resolve();

  const allLoaded = Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
  const timeout = new Promise<void>((resolve) =>
    setTimeout(resolve, timeoutMs)
  );
  return Promise.race([allLoaded, timeout]).then(() => {});
}

const DEFAULT_GST_PERCENTAGE = 18;

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
};

function formatQtyDisplay(item: PurchaseOrderItem): string {
  const orderedQty = item.orderedQuantity != null ? Number(item.orderedQuantity) : null;
  const orderedUnit = item.orderedUnit?.trim();
  const baseUnit = item.unit?.trim() || 'nos';
  const qty = Number(item.quantity) || 0;
  if (orderedQty != null && orderedUnit) {
    return `${orderedQty} ${orderedUnit}`;
  }
  return `${qty} ${baseUnit}`;
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

/**
 * Generate HTML string for a Purchase Order PDF.
 */
export function generatePOHtml(
  po: PurchaseOrder,
  logoDataUrl?: string,
  approvedByName?: string
): string {
  const approvedByDisplay =
    approvedByName ?? po.downloadedByName ?? po.reviewedByName ?? '—';
  const itemRows = (po.items ?? []).map((item, index) => {
    const slNo = index + 1;
    const qtyDisplay = formatQtyDisplay(item);
    const remarks = item.remarks?.trim() ?? '';
    return `
      <tr>
        <td style="padding: 4px 12px; border: 1px solid #000; font-size: 16px; color: #000; text-align: center;">${slNo}</td>
        <td style="padding: 4px 12px; border: 1px solid #000; font-size: 16px; color: #000;">${escapeHtml(item.itemName)}</td>
        <td style="padding: 4px 12px; border: 1px solid #000; font-size: 16px; color: #000;">${escapeHtml(qtyDisplay)}</td>
        <td style="padding: 4px 12px; border: 1px solid #000; font-size: 16px; color: #000;">${escapeHtml(remarks)}</td>
      </tr>`;
  }).join('');

  const billingAddressLines = companyConfig.address
    .split('\n')
    .map((line: string) => `<p style="margin: 0 0 2px; font-size: 16px; font-weight: bold; color: #000;">${escapeHtml(line.trim())}</p>`)
    .join('');

  const vendorAddressLines = (po.vendorAddress ?? '')
    .split('\n')
    .filter((l: string) => l.trim())
    .map((line: string) => `<p style="margin: 0 0 2px; font-size: 16px; font-weight: bold; color: #000;">${escapeHtml(line.trim())}</p>`)
    .join('');

  const logoImg = logoDataUrl
    ? `<img src="${escapeHtml(logoDataUrl)}" alt="${escapeHtml(companyConfig.logoAlt)}" style="height: 60px; width: auto; display: block;" />`
    : typeof window !== 'undefined'
      ? `<img src="${window.location.origin}${companyConfig.logoPath}" alt="${escapeHtml(companyConfig.logoAlt)}" style="height: 60px; width: auto; display: block;" />`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #000; padding: 24px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
    th, td { border: 1px solid #000; }
    th { background: #f0f0f0; font-size: 16px; font-weight: bold; padding: 10px 12px; text-align: center; }
    p { margin: 0; }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 8px;">
    <div style="font-size: 26px; font-weight: 900; color: #000; text-transform: uppercase;">${escapeHtml(companyConfig.name)}</div>
  </div>
  <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 32px; position: relative; height: 60px;">
    <div style="position: absolute; left: 0; top: 0;">${logoImg}</div>
    <div style="border: 3px solid #000; border-radius: 8px; padding: 8px 24px; background: #fff;">
      <div style="font-size: 20px; font-weight: 900; color: #000; letter-spacing: 0.5px;">PURCHASE ORDER</div>
    </div>
  </div>
  <div style="display: flex; gap: 40px; margin-bottom: 32px;">
    <div style="flex: 1; display: flex; flex-direction: column; gap: 24px;">
      <div style="border: 3px solid #000; padding: 12px; min-height: 140px;">
        <p style="font-size: 16px; font-weight: 900; margin: 0 0 4px; color: #000;">To</p>
        <p style="margin: 0 0 2px; font-size: 16px; font-weight: 900; color: #000; text-transform: uppercase;">${escapeHtml(po.vendorName ?? '—')}</p>
        ${vendorAddressLines || `<p style="margin: 0 0 2px; font-size: 16px; font-weight: bold; color: #000;">—</p>`}
        ${po.vendorEmail ? `<p style="margin: 0 0 2px; font-size: 16px; font-weight: bold; color: #000;">Email: ${escapeHtml(po.vendorEmail)}</p>` : ''}
        ${po.vendorGstin ? `<p style="margin: 0; font-size: 16px; font-weight: bold; color: #000;">GSTIN: ${escapeHtml(po.vendorGstin)}</p>` : ''}
      </div>
      <div style="border: 3px solid #000; padding: 12px; min-height: 140px;">
        <p style="font-size: 17px; font-weight: 900; margin: 0 0 6px; color: #000; text-decoration: underline;">Billing Address</p>
        <p style="margin: 0 0 2px; font-size: 16px; font-weight: 900; color: #000; text-transform: uppercase;">${escapeHtml(companyConfig.name)}</p>
        ${billingAddressLines}
        <p style="margin: 2px 0 0; font-size: 16px; font-weight: bold; color: #000;">Email: ${escapeHtml(companyConfig.email)}</p>
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #000;">GSTIN: ${escapeHtml(companyConfig.gstin)}</p>
      </div>
    </div>
    <div style="width: 360px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px;">
      <div style="border: 2px solid #000; padding: 12px 16px; display: flex; align-items: center;">
        <div style="font-size: 16px; font-weight: 900; color: #000; width: 60px;">Date</div>
        <div style="font-size: 16px; font-weight: 900; color: #000; flex: 1; text-align: center;">${escapeHtml(formatDate(po.createdAt))}</div>
      </div>
      <div style="border: 2px solid #000; padding: 12px 16px; text-align: center;">
        <div style="font-size: 16px; font-weight: 900; color: #000;">P.O. No. ${escapeHtml(po.poNumber ?? '—')}</div>
      </div>
      <div style="border: 2px solid #000; padding: 12px 16px; text-align: center;">
        <div style="font-size: 16px; font-weight: 900; color: #000;">Location / Work: ${escapeHtml(po.location ?? '—')}</div>
      </div>
      <div style="border: 2px solid #000; padding: 12px 16px; text-align: center;">
        <div style="font-size: 16px; font-weight: 900; color: #000;">JOB NO: ${escapeHtml(po.jobNo ?? '—')}</div>
      </div>
      <div style="border: 2px solid #000; padding: 12px 16px; text-align: center;">
        <div style="font-size: 16px; font-weight: 900; color: #000;">Ordered by: ${escapeHtml(po.createdByName ?? '—')}</div>
      </div>
      <div style="border: 2px solid #000; padding: 12px 16px; text-align: center;">
        <div style="font-size: 16px; font-weight: 900; color: #000;">Approved by: ${escapeHtml(approvedByDisplay)}</div>
      </div>
    </div>
  </div>
  <p style="margin: 0 0 8px; font-size: 16px; font-weight: 900; color: #000;">Dear Sir,</p>
  <p style="margin: 0 0 16px 40px; font-size: 16px; font-weight: 900; color: #000;">Please supply the following items</p>
  <table style="margin-bottom: 32px;">
    <thead>
      <tr>
        <th style="width: 60px;">Sl<br/>No</th>
        <th>ITEM</th>
        <th style="width: 100px;">Qty</th>
        <th style="width: 30%;">Remarks</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div style="margin-top: 48px; display: flex; flex-direction: column; align-items: flex-end;">
    <div style="width: 220px; height: 24px; border-bottom: 1px solid #000; margin-bottom: 8px;"></div>
    <p style="font-size: 16px; font-weight: bold; color: #000; margin: 0; text-decoration: underline;">Authorised Signature</p>
  </div>
</body>
</html>`;
}

export function buildDraftPOForPrint(
  formData: {
    vendorName: string;
    vendorContact: string;
    vendorEmail?: string;
    vendorAddress?: string;
    vendorGstin?: string;
    location?: string;
    jobNo?: string;
    items: PurchaseOrderItem[];
    justification: string;
    expectedDeliveryDate: Date | null;
    userName: string;
  },
  poNumber: string = 'DRAFT'
): PurchaseOrder {
  const items = formData.items.map((i) => {
    const unitPrice = i.unitPrice ?? 0;
    const amount = i.amount ?? i.quantity * unitPrice;
    const gstPct = i.gstPercentage ?? (unitPrice > 0 ? DEFAULT_GST_PERCENTAGE : 0);
    const gstAmt = gstPct > 0 ? (i.gstAmount ?? Math.round((amount * gstPct) / 100)) : 0;
    return { ...i, amount, gstAmount: gstAmt, unitPrice };
  });
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const gstAmount = items.reduce((s, i) => s + (i.gstAmount ?? 0), 0);
  const totalAmount = subtotal + gstAmount;
  const now = new Date().toISOString();

  return {
    id: '',
    poNumber,
    vendorId: '',
    vendorName: formData.vendorName,
    vendorContact: formData.vendorContact,
    vendorEmail: formData.vendorEmail,
    vendorAddress: formData.vendorAddress,
    vendorGstin: formData.vendorGstin,
    location: formData.location,
    jobNo: formData.jobNo,
    items,
    subtotal,
    gstPercentage: subtotal > 0 ? (gstAmount / subtotal) * 100 : 0,
    gstAmount,
    totalAmount,
    justification: formData.justification,
    expectedDeliveryDate: formData.expectedDeliveryDate
      ? formData.expectedDeliveryDate.toISOString()
      : null,
    documents: [],
    status: 'draft',
    createdBy: '',
    createdByName: formData.userName,
    createdAt: now,
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    adminComments: null,
    rejectionReason: null,
    receivedAt: null,
    receivedBy: null,
    receivedByName: null,
    receivedNotes: null,
    updatedAt: now,
  };
}

/**
 * Web: Open PO HTML in new window and trigger browser print.
 * For signed PDF URL, open in new tab.
 */
export async function printPurchaseOrder(
  po: PurchaseOrder,
  approvedByName?: string
): Promise<void> {
  const signedUrl = po.signedPdfUrl?.trim();
  if (signedUrl) {
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const logoDataUrl = await loadLogoDataUrl();
  const html = generatePOHtml(po, logoDataUrl || undefined, approvedByName);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked. Allow popups to print.');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  await waitForImages(printWindow);
  await new Promise((r) => setTimeout(r, 150));
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}
