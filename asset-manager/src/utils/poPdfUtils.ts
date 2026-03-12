import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';
import type { PurchaseOrder, PurchaseOrderItem } from '../types/purchaseOrder';

const DEFAULT_GST_PERCENTAGE = 18;

/** Load IBF logo as base64 for embedding in PDF HTML. Returns empty string on failure. */
async function loadLogoBase64(): Promise<string> {
  try {
    const [asset] = await Asset.loadAsync(require('../assets/images/IBF_logo.png'));
    const uri = asset.localUri ?? asset.uri;
    if (!uri) return '';

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { base64: true, format: ImageManipulator.SaveFormat.PNG }
    );
    return result.base64 ?? '';
  } catch {
    return '';
  }
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN')}`;

/** Format currency or "—" when amount is 0 (optional/not provided) */
const formatCurrencyOrOptional = (amount: number): string =>
  amount > 0 ? formatCurrency(amount) : '—';

/** Format GST % or "—" when 0 (optional/not provided) */
const formatGstOrOptional = (gstPct: number): string =>
  gstPct > 0 ? `${gstPct}%` : '—';

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  ordered: 'Ordered',
  received: 'Received',
  rejected: 'Rejected',
};

const statusBadgeClass: Record<string, string> = {
  draft: 'background: rgba(100, 116, 139, 0.2); color: #64748B;',
  pending_approval: 'background: rgba(217, 119, 6, 0.2); color: #D97706;',
  approved: 'background: rgba(30, 64, 175, 0.2); color: #1E40AF;',
  ordered: 'background: rgba(22, 163, 74, 0.2); color: #16A34A;',
  received: 'background: rgba(71, 85, 105, 0.2); color: #475569;',
  rejected: 'background: rgba(220, 38, 38, 0.2); color: #DC2626;',
};

/**
 * Generate HTML string for a Purchase Order PDF.
 * Uses CIAMS design system colors and typography.
 * @param po - Purchase order data
 * @param logoBase64 - Optional base64-encoded logo image for header
 */
export function generatePOHtml(po: PurchaseOrder, logoBase64?: string): string {
  const statusLabel = statusLabels[po.status] ?? po.status;
  const statusStyle = statusBadgeClass[po.status] ?? statusBadgeClass.draft;

  const itemRows = (po.items ?? []).map((item) => {
    const amount = Number(item.amount) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const gstPct = Number(item.gstPercentage ?? (unitPrice > 0 ? DEFAULT_GST_PERCENTAGE : 0)) || 0;
    const gstAmt = gstPct > 0 ? (Number(item.gstAmount) || Math.round((amount * gstPct) / 100)) : 0;
    const totalWithGst = amount + gstAmt;
    const quantity = Number(item.quantity) || 0;
    const orderedQty = item.orderedQuantity != null ? Number(item.orderedQuantity) : null;
    const orderedUnit = item.orderedUnit?.trim();
    const displayQty = orderedQty != null && orderedUnit
      ? `${orderedQty} ${orderedUnit} (${quantity} Pcs stock)`
      : `${quantity} Pcs`;
    const priceBasis = orderedUnit ? `per ${orderedUnit}` : 'per Piece';
    return `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-size: 15px; color: #0F172A;">${escapeHtml(item.itemName)}</td>
        <td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-size: 13px; color: #64748B;">${escapeHtml(item.itemSku)}</td>
        <td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-size: 15px; color: #0F172A; text-align: right;">${escapeHtml(displayQty)}</td>
        <td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-size: 15px; color: #0F172A; text-align: right;">${formatCurrencyOrOptional(unitPrice)} <span style="font-size: 12px; color: #64748B;">${escapeHtml(priceBasis)}</span></td>
        <td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-size: 15px; color: #0F172A; text-align: right;">${formatGstOrOptional(gstPct)}</td>
        <td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-size: 15px; font-weight: 600; color: #0F172A; text-align: right;">${formatCurrencyOrOptional(totalWithGst)}</td>
      </tr>`;
  }).join('');

  const footerParts: string[] = [];
  if (po.receivedByName) {
    footerParts.push(`Received by ${escapeHtml(po.receivedByName)} on ${formatDate(po.receivedAt)}`);
  }

  const logoImg = logoBase64
    ? `<div class="header-logo"><img src="data:image/png;base64,${logoBase64}" alt="IBF Logo" style="height: 48px; width: auto; display: block;" /></div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, Helvetica, sans-serif; color: #0F172A; padding: 24px; font-size: 15px; }
    .header { border-bottom: 2px solid #1E40AF; padding-bottom: 16px; margin-bottom: 24px; display: flex; flex-direction: row; align-items: center; gap: 16px; }
    .header-brand { flex: 1; }
    .header-logo { flex-shrink: 0; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 17px; font-weight: 600; color: #0F172A; margin-bottom: 12px; }
    .label { font-size: 13px; color: #64748B; }
    .value { font-size: 15px; color: #0F172A; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #E2E8F0; }
    th { background: #F8FAFC; font-size: 13px; color: #64748B; font-weight: 600; padding: 8px 12px; text-align: left; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; margin-left: 8px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 13px; color: #64748B; }
    .signature-block { margin-top: 48px; display: flex; flex-direction: column; align-items: flex-end; }
    .signature-line { width: 200px; border-bottom: 1px solid #0F172A; padding-bottom: 4px; }
    .signature-label { font-size: 13px; color: #64748B; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    ${logoImg}
    <div class="header-brand">
      <p style="font-size: 16px; font-weight: 600; margin: 0 0 8px; color: #1E40AF;">IBF Engineering Services Pvt Ltd</p>
      <h1 style="font-size: 22px; font-weight: 600; margin: 0; color: #0F172A;">PURCHASE ORDER</h1>
      <p style="font-size: 15px; margin: 8px 0 0; color: #0F172A;">
        ${escapeHtml(po.poNumber)}
        <span class="status-badge" style="${statusStyle}">${escapeHtml(statusLabel)}</span>
      </p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">VENDOR</div>
    <p style="margin: 0 0 4px; font-size: 15px; color: #0F172A;">${escapeHtml(po.vendorName ?? '—')}</p>
    <p style="margin: 0 0 4px; font-size: 13px; color: #64748B;">📞 ${escapeHtml(po.vendorContact ?? '—')}</p>
    ${po.vendorEmail ? `<p style="margin: 0 0 4px; font-size: 13px; color: #64748B;">${escapeHtml(po.vendorEmail)}</p>` : ''}
    ${po.vendorAddress ? `<p style="margin: 0; font-size: 13px; color: #64748B;">${escapeHtml(po.vendorAddress)}</p>` : ''}
  </div>

  <div class="section">
    <div class="section-title">ITEMS</div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>SKU</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">GST %</th>
          <th style="text-align: right;">Amount (incl. GST)</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">SUMMARY</div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span class="label">Subtotal</span>
      <span class="value">${formatCurrencyOrOptional(Number(po.subtotal) || 0)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span class="label">Total GST</span>
      <span class="value">${formatCurrencyOrOptional(Number(po.gstAmount) || 0)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #E2E8F0;">
      <span class="section-title" style="margin: 0;">Total</span>
      <span style="font-size: 17px; font-weight: 600; color: #0F172A;">${formatCurrencyOrOptional(Number(po.totalAmount) || 0)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">JUSTIFICATION</div>
    <p style="margin: 0; font-size: 15px; color: #0F172A;">${escapeHtml(po.justification || '—')}</p>
  </div>

  <div class="section">
    <div class="section-title">EXPECTED DELIVERY</div>
    <p style="margin: 0; font-size: 15px; color: #0F172A;">${formatDate(po.expectedDeliveryDate)}</p>
  </div>

  <div class="signature-block">
    <div class="signature-line"></div>
    <p class="signature-label" style="margin-right: 0;">Authorized Signature</p>
  </div>

  ${footerParts.length > 0 ? `<div class="footer">
    ${footerParts.map((p) => `<p style="margin: 0 0 4px;">${p}</p>`).join('')}
  </div>` : ''}
</body>
</html>`;
}

/**
 * Escapes HTML special characters to prevent XSS when interpolating user-provided
 * strings into generated HTML. Returns empty string for null/undefined.
 */
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
 * Build a PurchaseOrder-like object from form data for printing draft/preview.
 */
export function buildDraftPOForPrint(
  formData: {
    vendorName: string;
    vendorContact: string;
    vendorEmail?: string;
    vendorAddress?: string;
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
 * Generate PDF from PO HTML and share via native share dialog.
 * User can print or save to files.
 */
export async function printPurchaseOrder(po: PurchaseOrder): Promise<void> {
  try {
    const logoBase64 = await loadLogoBase64();
    const html = generatePOHtml(po, logoBase64);
    const { uri } = await Print.printToFileAsync({
      html,
      width: 612,
      height: 792,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Print ${po.poNumber}`,
        UTI: '.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error printing purchase order:', err);

    if (
      err.message?.includes('expo-print') ||
      err.message?.includes('expo-sharing') ||
      err.message?.includes('Cannot find module')
    ) {
      throw new Error(
        'PDF printing requires expo-print and expo-sharing. Install with: npx expo install expo-print expo-sharing'
      );
    }

    throw new Error(err.message ?? 'Failed to print purchase order');
  }
}
