import type { ActivityLog } from '../types/activityLog';

function formatQty(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return '—';
    return Number.isInteger(v) ? String(v) : String(v);
  }
  return String(v);
}

/** Primary narrative line — summary is written for item-scoped events */
export function getItemHistoryPrimaryLine(log: ActivityLog): string {
  const s = (log.summary ?? '').trim();
  if (s.length > 0) return s;
  return (log.targetDisplay ?? '').trim() || log.actionType;
}

/**
 * Stock / quantity lines from change entries. Order: inventory adjustment → central
 * store on item master → PO line → sites → total. Wording emphasizes how much was
 * in central store (or other totals) *when the update was made*.
 */
export function getItemHistoryStockLines(log: ActivityLog): string[] {
  const changes = log.changes ?? [];
  const byField = new Map<string, (typeof changes)[0]>();
  for (const c of changes) {
    byField.set(String(c.field ?? '').toLowerCase(), c);
  }

  const lines: string[] = [];

  const q = byField.get('quantity');
  const loc = byField.get('locationname');
  if (q) {
    const locStr = loc ? String(loc.oldValue ?? '').toLowerCase() : '';
    const isCentralLoc =
      locStr.includes('central') || locStr.includes('central store');
    if (isCentralLoc) {
      lines.push(
        `Central store had ${formatQty(q.oldValue)} when updating → ${formatQty(q.newValue)} after`
      );
    } else {
      const label = loc ? String(loc.oldValue ?? 'Location') : 'Location';
      lines.push(
        `${label}: ${formatQty(q.oldValue)} when updating → ${formatQty(q.newValue)} after`
      );
    }
  }

  const cs = byField.get('centralstorequantity');
  if (cs) {
    lines.push(
      `Central store had ${formatQty(cs.oldValue)} when updating → ${formatQty(cs.newValue)} after`
    );
  }

  const ctx = byField.get('contextcentralstore');
  if (ctx) {
    const ov = ctx.oldValue;
    const nv = ctx.newValue;
    if (ov === nv) {
      const title = (ctx.fieldLabel ?? 'Item master — central store total').trim();
      lines.push(`${title}: ${formatQty(ov)} units (at time of this event)`);
    } else {
      lines.push(
        `Central store had ${formatQty(ov)} when updating → ${formatQty(nv)} after`
      );
    }
  }

  const po = byField.get('receivedquantity');
  // If we have a central-store delta (PO receipt), skip redundant PO cumulative line.
  if (po && !byField.has('centralstorequantity')) {
    lines.push(
      `On PO (cumulative received): ${formatQty(po.oldValue)} → ${formatQty(po.newValue)}`
    );
  }

  const sites = byField.get('atsitesquantity');
  if (sites) {
    lines.push(
      `At sites had ${formatQty(sites.oldValue)} when updating → ${formatQty(sites.newValue)} after`
    );
  }

  const tot = byField.get('totalquantity');
  if (tot) {
    lines.push(
      `Total quantity (all locations) had ${formatQty(tot.oldValue)} when updating → ${formatQty(tot.newValue)} after`
    );
  }

  return lines;
}
