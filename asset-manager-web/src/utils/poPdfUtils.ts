/**
 * PO PDF utilities - Web version
 * Uses window.print() with generated HTML. Logo embedded as data URL when possible.
 */
import type { PurchaseOrder, PurchaseOrderItem } from '../types/purchaseOrder';
import { companyConfig } from '../config/company';

const DEFAULT_GST_PERCENTAGE = 18;

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

function formatInr(n: number): string {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Keeps ₹ and figure on one line in print/PDF (normal space after ₹ often wraps). */
function inrAmountCellHtml(amount: number): string {
  return `<span style="white-space:nowrap">₹\u00A0${formatInr(amount)}</span>`;
}

function nowrapNumCellHtml(n: number): string {
  return `<span style="white-space:nowrap">${formatInr(n)}</span>`;
}

function formatDdMmYyyy(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function deliveryDateLabel(po: PurchaseOrder): string {
  const text = po.deliveryDateText?.trim();
  if (text) return text;
  if (!po.expectedDeliveryDate) return 'Immediately';
  return formatDdMmYyyy(po.expectedDeliveryDate);
}

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

function qtyNumericForTotal(item: PurchaseOrderItem): number {
  if (item.orderedQuantity != null) return Number(item.orderedQuantity) || 0;
  return Number(item.quantity) || 0;
}

function itemUnitColumn(item: PurchaseOrderItem): string {
  return item.orderedUnit?.trim() || item.unit?.trim() || '—';
}

function itemLineTotal(item: PurchaseOrderItem): number {
  const base = item.amount ?? 0;
  const gst = item.gstAmount ?? 0;
  return base + gst;
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

const IBF_BLUE = '#0070C0';
const IBF_RED = '#C00000';

function companyAddressLinesHtml(): string {
  return companyConfig.address
    .split('\n')
    .map((line) =>
      line.trim()
        ? `<div style="font-size:10px;font-weight:normal;color:#000;line-height:1.45;">${escapeHtml(line.trim())}</div>`
        : ''
    )
    .join('');
}

function vendorAddressLinesHtml(po: PurchaseOrder): string {
  return (po.vendorAddress ?? '')
    .split('\n')
    .filter((l) => l.trim())
    .map(
      (line) =>
        `<div style="font-size:10px;font-weight:normal;color:#000;line-height:1.45;">${escapeHtml(line.trim())}</div>`
    )
    .join('');
}

function buyerContactLine(po: PurchaseOrder): string {
  const name = po.buyerContactName?.trim();
  const phone = po.buyerContactPhone?.trim();
  if (name && phone) return `${name} (${phone})`;
  if (name) return name;
  if (phone) return phone;
  return '—';
}

function poIssueSiteDisplay(po: PurchaseOrder): string {
  return (
    po.poIssueSite?.trim() ||
    po.siteName?.trim() ||
    po.location?.trim() ||
    '—'
  );
}

function deliverLocationDisplay(po: PurchaseOrder): string {
  return po.deliveryLocation?.trim() || po.location?.trim() || '—';
}

function vendorContactPersonLine(po: PurchaseOrder): string {
  return po.vendorContactPerson?.trim() || '—';
}

function vendorPhoneEmailLine(po: PurchaseOrder): string {
  const phone = po.vendorContact?.trim() || '';
  const email = po.vendorEmail?.trim() || '';
  if (phone && email) return `${phone} / ${email}`;
  return phone || email || '—';
}

export function generatePOHtml(
  po: PurchaseOrder,
  logoDataUrl?: string,
  approvedByName?: string
): string {
  const approvedByDisplay =
    approvedByName ?? po.downloadedByName ?? po.reviewedByName ?? '—';
  const docTitle = companyConfig.documentTitle ?? 'PURCHASE / SERVICE ORDER';
  const displayName = companyConfig.documentDisplayName ?? companyConfig.name;
  const isoLine = companyConfig.isoCertificationLine?.trim();
  const phones = companyConfig.phones?.trim();
  const website = companyConfig.website?.trim();
  const cin = companyConfig.cin?.trim();
  const deliverTo = companyConfig.deliveryToName ?? companyConfig.name;
  const deliverAddr = companyConfig.deliveryAddress ?? '';
  const deliverContacts = companyConfig.deliveryContacts ?? '';
  const deliverWeb = companyConfig.deliveryWebsite ?? website ?? '';
  const footer = companyConfig.documentFooter ?? displayName;
  const terms = companyConfig.termsAndConditions ?? [];

  const items = po.items ?? [];
  let totalQtySum = 0;
  const itemRows = items
    .map((item, index) => {
      totalQtySum += qtyNumericForTotal(item);
      const sl = index + 1;
      const lineTot = itemLineTotal(item);
      const gstPct = item.gstPercentage ?? DEFAULT_GST_PERCENTAGE;
      return `<tr>
        <td style="border:1px solid #000;padding:8px 10px;font-size:11px;text-align:center;vertical-align:middle;">${sl}</td>
        <td style="border:1px solid #000;padding:8px 10px;font-size:11px;vertical-align:middle;">${escapeHtml(item.itemSku || '—')}</td>
        <td style="border:1px solid #000;padding:8px 10px;font-size:11px;vertical-align:middle;">${escapeHtml(item.itemName)}</td>
        <td style="border:1px solid #000;padding:8px 10px;font-size:11px;text-align:center;vertical-align:middle;">${escapeHtml(itemUnitColumn(item))}</td>
        <td style="border:1px solid #000;padding:8px 10px;font-size:11px;text-align:right;vertical-align:middle;">${nowrapNumCellHtml(item.unitPrice ?? 0)}</td>
        <td style="border:1px solid #000;padding:8px 10px;font-size:11px;text-align:right;vertical-align:middle;">${escapeHtml(formatQtyDisplay(item))}</td>
        <td style="border:1px solid #000;padding:8px 10px;font-size:11px;text-align:center;vertical-align:middle;">${gstPct > 0 ? `${gstPct}%` : '—'}</td>
        <td style="border:1px solid #000;padding:8px 10px;font-size:11px;text-align:right;vertical-align:middle;">${inrAmountCellHtml(lineTot)}</td>
      </tr>`;
    })
    .join('');

  const termsHtml =
    terms.length > 0
      ? `<ol style="margin:8px 0 0 18px;padding:0;font-size:10px;line-height:1.5;color:#000;">
          ${terms.map((t) => `<li style="margin-bottom:5px;">${escapeHtml(t)}</li>`).join('')}
        </ol>`
      : '';

  const justificationText = (po.justification ?? '').trim();
  const justificationBodyHtml = `<div style="margin-top:4px;font-size:10px;line-height:1.5;color:#000;white-space:pre-wrap;">${justificationText ? escapeHtml(justificationText) : '—'}</div>`;

  const grrList = po.grrReceipts ?? [];
  const grrSectionHtml =
    grrList.length > 0
      ? `<div style="margin-top:14px;border:1px solid #000;padding:12px 14px;background:#fafafa;">
    <div style="font-size:11px;font-weight:bold;margin-bottom:8px;color:#000;">Receipts</div>
    <table style="width:100%;border-collapse:collapse;font-size:10px;">
      <thead><tr>
        <th style="text-align:left;border-bottom:1px solid #000;padding:4px 6px;width:18%;">GRR</th>
        <th style="text-align:left;border-bottom:1px solid #000;padding:4px 6px;width:14%;">Date</th>
        <th style="text-align:left;border-bottom:1px solid #000;padding:4px 6px;width:18%;">By</th>
        <th style="text-align:left;border-bottom:1px solid #000;padding:4px 6px;">Received</th>
      </tr></thead>
      <tbody>
        ${grrList
          .map((r) => {
            const lines = r.lineItems?.filter((li) => li.quantityReceived > 0) ?? [];
            const receivedCell =
              lines.length > 0
                ? lines
                    .map((li) => {
                      const u = li.unit?.trim() ? escapeHtml(li.unit) : 'Pcs';
                      return `${escapeHtml(li.itemName)} ${li.quantityReceived} ${u}`;
                    })
                    .join(' · ')
                : '—';
            return `<tr>
          <td style="padding:6px 6px;border-bottom:1px solid #eee;vertical-align:top;">${escapeHtml(r.grrNumber)}</td>
          <td style="padding:6px 6px;border-bottom:1px solid #eee;vertical-align:top;">${escapeHtml(formatDdMmYyyy(r.receivedAt))}</td>
          <td style="padding:6px 6px;border-bottom:1px solid #eee;vertical-align:top;">${escapeHtml(r.receivedByName ?? '—')}</td>
          <td style="padding:6px 6px;border-bottom:1px solid #eee;vertical-align:top;line-height:1.4;">${receivedCell}</td>
        </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </div>`
      : '';

  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="${escapeHtml(companyConfig.logoAlt)}" style="height:96px;max-width:100%;width:auto;display:block;object-fit:contain;" />`
    : typeof window !== 'undefined'
      ? `<img src="${window.location.origin}${companyConfig.logoPath}" alt="${escapeHtml(companyConfig.logoAlt)}" style="height:96px;max-width:100%;width:auto;display:block;object-fit:contain;" />`
      : '';

  const totalsFooterRow = `<tr>
    <td colspan="5" style="border:1px solid #000;padding:10px 12px;background:#fff;"></td>
    <td style="border:1px solid #000;padding:10px 12px;font-size:11px;text-align:right;font-weight:bold;vertical-align:middle;">${totalQtySum.toLocaleString('en-IN')}</td>
    <td style="border:1px solid #000;padding:10px 12px;font-size:10px;text-align:center;vertical-align:middle;">&nbsp;</td>
    <td style="border:1px solid #000;padding:6px;vertical-align:middle;min-width:128px;width:26%;">
      <table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:11px;">
        <colgroup><col style="width:46%" /><col style="width:54%" /></colgroup>
        <tr>
          <td style="padding:8px 10px;font-weight:bold;text-align:right;border-bottom:1px solid #000;vertical-align:middle;"><span style="white-space:nowrap">Sub\u00A0Total</span></td>
          <td style="padding:8px 10px;text-align:right;border-bottom:1px solid #000;vertical-align:middle;">${inrAmountCellHtml(po.subtotal ?? 0)}</td>
        </tr>
        <tr>
          <td style="padding:8px 10px;font-weight:bold;text-align:right;border-bottom:1px solid #000;vertical-align:middle;"><span style="white-space:nowrap">TAX</span></td>
          <td style="padding:8px 10px;text-align:right;border-bottom:1px solid #000;vertical-align:middle;">${inrAmountCellHtml(po.gstAmount ?? 0)}</td>
        </tr>
        <tr>
          <td style="padding:10px 10px;font-weight:bold;text-align:right;vertical-align:middle;"><span style="white-space:nowrap">Final\u00A0Total</span></td>
          <td style="padding:10px 10px;font-weight:bold;text-align:right;vertical-align:middle;">${inrAmountCellHtml(po.totalAmount ?? 0)}</td>
        </tr>
      </table>
    </td>
  </tr>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 10mm 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; padding: 18px 22px 24px; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table.po-grid { width: 100%; border-collapse: collapse; }
    table.po-grid th, table.po-grid td { border: 1px solid #000; }
    table.po-grid thead { display: table-header-group; }
    table.po-grid tbody tr { page-break-inside: avoid; break-inside: avoid; }
    table.po-signatures { page-break-inside: avoid; break-inside: avoid; }
    .po-page-footer { page-break-inside: avoid; break-inside: avoid; }
    p { margin: 0; }
  </style>
</head>
<body>
  <table style="width:100%;border-collapse:collapse;border:none;">
    <tr>
      <td style="width: 42%; vertical-align: top; border: none; padding: 0 12px 0 0;">
        ${logoImg}
        ${isoLine ? `<div style="font-size:9px;margin-top:8px;font-weight:bold;color:${IBF_RED};">${escapeHtml(isoLine)}</div>` : ''}
      </td>
      <td style="vertical-align: top; text-align: right; border: none; padding: 0;">
        <div style="font-size:15px;font-weight:bold;color:${IBF_BLUE};line-height:1.2;">${escapeHtml(displayName)}</div>
        <div style="margin-top:8px;">${companyAddressLinesHtml()}</div>
        ${phones ? `<div style="font-size:10px;margin-top:8px;color:#000;">Ph: <strong>${escapeHtml(phones)}</strong></div>` : ''}
        <div style="font-size:10px;margin-top:4px;color:#000;">Email: <strong>${escapeHtml(companyConfig.email)}</strong></div>
        ${website ? `<div style="font-size:10px;margin-top:4px;color:#000;">Website: <strong>${escapeHtml(website)}</strong></div>` : ''}
        ${cin ? `<div style="font-size:10px;margin-top:4px;color:#000;">CIN No.: <strong>${escapeHtml(cin)}</strong></div>` : ''}
        <div style="font-size:10px;margin-top:4px;color:#000;">GST No.: <strong>${escapeHtml(companyConfig.gstin)}</strong></div>
      </td>
    </tr>
  </table>

  <div style="border-top:3px solid #000;margin:14px 0 0 0;height:0;line-height:0;font-size:0;"></div>

  <table class="po-grid" style="margin-top:10px;border:2px solid #000;">
    <tr>
      <td colspan="4" style="padding:12px 16px;font-size:13px;font-weight:bold;text-align:center;border:none;border-bottom:1px solid #000;vertical-align:middle;letter-spacing:0.4px;">${escapeHtml(docTitle)}</td>
    </tr>
    <tr>
      <td colspan="2" style="vertical-align:top;padding:14px 14px;border:none;border-right:1px solid #000;">
        <div style="font-size:12px;font-weight:bold;text-transform:uppercase;margin-bottom:6px;color:#000;">${escapeHtml(po.vendorName ?? '—')}</div>
        ${vendorAddressLinesHtml(po) || `<div style="font-size:10px;">—</div>`}
        <div style="margin-top:10px;font-size:10px;"><strong>GST No.:</strong> ${escapeHtml(po.vendorGstin?.trim() || '—')}</div>
        <div style="margin-top:6px;font-size:10px;"><strong>Contact Person:</strong> ${escapeHtml(vendorContactPersonLine(po))}</div>
        <div style="margin-top:4px;font-size:10px;"><strong>Contact No:</strong> ${escapeHtml(vendorPhoneEmailLine(po))}</div>
      </td>
      <td colspan="2" style="vertical-align:top;padding:14px 14px;border:none;">
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <tr><td style="padding:8px 12px;font-weight:bold;vertical-align:middle;">Purchase Order No.</td><td style="padding:8px 12px;text-align:right;font-weight:bold;vertical-align:middle;">${escapeHtml(po.poNumber ?? '—')}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;vertical-align:middle;">JOB No.</td><td style="padding:8px 12px;text-align:right;font-weight:bold;vertical-align:middle;">${escapeHtml(po.jobNo?.trim() || '—')}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;vertical-align:middle;">Issue Date</td><td style="padding:8px 12px;text-align:right;font-weight:bold;vertical-align:middle;">${escapeHtml(formatDdMmYyyy(po.createdAt))}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;vertical-align:middle;">Delivery Date</td><td style="padding:8px 12px;text-align:right;font-weight:bold;vertical-align:middle;">${escapeHtml(deliveryDateLabel(po))}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;vertical-align:middle;">PO Issue Site</td><td style="padding:8px 12px;text-align:right;font-weight:bold;vertical-align:middle;">${escapeHtml(poIssueSiteDisplay(po))}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;vertical-align:middle;">Contact person</td><td style="padding:8px 12px;text-align:right;font-weight:bold;vertical-align:middle;">${escapeHtml(buyerContactLine(po))}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;vertical-align:middle;">Deliver Location</td><td style="padding:8px 12px;text-align:right;font-weight:bold;vertical-align:middle;">${escapeHtml(deliverLocationDisplay(po))}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;vertical-align:middle;">Approved by</td><td style="padding:8px 12px;text-align:right;font-weight:bold;vertical-align:middle;">${escapeHtml(approvedByDisplay)}</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <div style="border:2px solid #000;border-top:none;padding:14px 14px;">
    <div style="font-size:11px;font-weight:bold;margin-bottom:6px;color:#000;">Deliver To:</div>
    <div style="font-size:11px;font-weight:bold;color:${IBF_BLUE};">${escapeHtml(deliverTo)}</div>
    <div style="margin-top:8px;font-size:10px;line-height:1.45;"><strong>Delivery Address:</strong> ${escapeHtml(deliverAddr || '—')}</div>
    <div style="margin-top:4px;font-size:10px;line-height:1.45;"><strong>Delivery Contact / Email:</strong> ${escapeHtml(deliverContacts || '—')}</div>
    ${deliverWeb ? `<div style="margin-top:4px;font-size:10px;"><strong>Website:</strong> ${escapeHtml(deliverWeb)}</div>` : ''}
  </div>

  <table class="po-grid" style="margin-top:0;border:2px solid #000;border-top:none;">
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="padding:10px 10px;font-size:10px;width:32px;">Sr.<br/>No.</th>
        <th style="padding:10px 10px;font-size:10px;width:64px;">SKU</th>
        <th style="padding:10px 10px;font-size:10px;">Description</th>
        <th style="padding:10px 10px;font-size:10px;width:40px;">Unit</th>
        <th style="padding:10px 10px;font-size:10px;width:62px;">U/Price</th>
        <th style="padding:10px 10px;font-size:10px;width:52px;">Q'ty</th>
        <th style="padding:10px 10px;font-size:10px;width:36px;">GST</th>
        <th style="padding:10px 10px;font-size:10px;min-width:108px;width:108px;">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}${totalsFooterRow}</tbody>
  </table>

  ${grrSectionHtml}

  <div style="margin-top:14px;border:1px solid #000;padding:14px 14px;background:#fff;">
    <div style="font-size:11px;font-weight:bold;margin-bottom:6px;color:${IBF_BLUE};">Remarks/Justifications</div>
    ${justificationBodyHtml}
    <div style="font-size:11px;font-weight:bold;margin-top:14px;margin-bottom:6px;color:${IBF_BLUE};">Terms &amp; Conditions</div>
    ${termsHtml}
  </div>

  <table class="po-signatures" style="width:100%;border-collapse:collapse;margin-top:18px;">
    <tr>
      <td style="border:1px solid #000;width:33%;padding:32px 12px 14px;vertical-align:bottom;">
        <div style="border-bottom:1px solid #000;height:22px;margin-bottom:6px;"></div>
        <div style="font-size:10px;font-weight:bold;">Authorized signature of Seller</div>
        <div style="font-size:10px;margin-top:8px;">Date: _______________</div>
      </td>
      <td style="border:1px solid #000;border-left:none;width:33%;padding:32px 12px 14px;vertical-align:bottom;">
        <div style="border-bottom:1px solid #000;height:22px;margin-bottom:6px;"></div>
        <div style="font-size:10px;font-weight:bold;">Verified by</div>
        <div style="font-size:10px;margin-top:8px;">Date: _______________</div>
      </td>
      <td style="border:1px solid #000;border-left:none;width:34%;padding:32px 12px 14px;vertical-align:bottom;">
        <div style="border-bottom:1px solid #000;height:22px;margin-bottom:6px;"></div>
        <div style="font-size:10px;font-weight:bold;color:${IBF_BLUE};">IBF Authorized Signature</div>
        <div style="font-size:10px;margin-top:8px;">Date: _______________</div>
      </td>
    </tr>
  </table>

  <div class="po-page-footer" style="border-top:2px solid ${IBF_BLUE};margin-top:18px;padding-top:10px;text-align:center;font-size:10px;font-weight:bold;color:${IBF_BLUE};">${escapeHtml(footer)}</div>
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
    vendorContactPerson?: string;
    location?: string;
    jobNo?: string;
    poIssueSite?: string;
    deliveryLocation?: string;
    buyerContactName?: string;
    buyerContactPhone?: string;
    siteId?: string;
    siteName?: string;
    deliveryDateText?: string;
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
    vendorContactPerson: formData.vendorContactPerson,
    location: formData.location,
    jobNo: formData.jobNo,
    poIssueSite: formData.poIssueSite,
    deliveryLocation: formData.deliveryLocation,
    buyerContactName: formData.buyerContactName,
    buyerContactPhone: formData.buyerContactPhone,
    siteId: formData.siteId,
    siteName: formData.siteName,
    deliveryDateText: formData.deliveryDateText,
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
