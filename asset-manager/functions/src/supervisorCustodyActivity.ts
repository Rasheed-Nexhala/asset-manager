/**
 * Pure helpers for detecting supervisor custody (supervisorOutstandingQty) changes on request line items.
 * Used by onRequestUpdated for activity logging.
 */

type RequestItemLine = Record<string, unknown>;

function itemsArrayToMap(items: unknown): Map<string, RequestItemLine> {
  const m = new Map<string, RequestItemLine>();
  if (!Array.isArray(items)) return m;
  for (const raw of items) {
    const line = raw as RequestItemLine;
    const id = String(line?.itemId ?? '');
    if (id) m.set(id, line);
  }
  return m;
}

/**
 * When only supervisorOutstandingQty changes on line items (split stock / return from supervisor),
 * and no other fields on those lines differ.
 */
export function analyzeSupervisorCustodyItemsChange(
  beforeItems: unknown,
  afterItems: unknown
): {
  isSupervisorOnly: boolean;
  deltas: Array<{
    itemId: string;
    itemName: string;
    oldSup: number;
    newSup: number;
  }>;
} {
  const bMap = itemsArrayToMap(beforeItems);
  const aMap = itemsArrayToMap(afterItems);
  if (bMap.size !== aMap.size) {
    return { isSupervisorOnly: false, deltas: [] };
  }
  const deltas: Array<{
    itemId: string;
    itemName: string;
    oldSup: number;
    newSup: number;
  }> = [];
  for (const id of bMap.keys()) {
    if (!aMap.has(id)) {
      return { isSupervisorOnly: false, deltas: [] };
    }
    const b = bMap.get(id)!;
    const a = aMap.get(id)!;
    const bSup = Number(b.supervisorOutstandingQty ?? 0);
    const aSup = Number(a.supervisorOutstandingQty ?? 0);
    const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
    for (const k of keys) {
      if (k === 'supervisorOutstandingQty') continue;
      if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) {
        return { isSupervisorOnly: false, deltas: [] };
      }
    }
    if (bSup !== aSup) {
      deltas.push({
        itemId: id,
        itemName: String(a.itemName ?? b.itemName ?? 'Item'),
        oldSup: bSup,
        newSup: aSup,
      });
    }
  }
  return {
    isSupervisorOnly: deltas.length > 0,
    deltas,
  };
}

/** Supervisor custody deltas for mixed edits (lists line-level sup qty changes). */
export function findSupervisorCustodyDeltas(
  beforeItems: unknown,
  afterItems: unknown
): Array<{
  itemId: string;
  itemName: string;
  oldSup: number;
  newSup: number;
}> {
  const bMap = itemsArrayToMap(beforeItems);
  const aMap = itemsArrayToMap(afterItems);
  const deltas: Array<{
    itemId: string;
    itemName: string;
    oldSup: number;
    newSup: number;
  }> = [];
  for (const id of bMap.keys()) {
    if (!aMap.has(id)) continue;
    const b = bMap.get(id)!;
    const a = aMap.get(id)!;
    const bSup = Number(b.supervisorOutstandingQty ?? 0);
    const aSup = Number(a.supervisorOutstandingQty ?? 0);
    if (bSup !== aSup) {
      deltas.push({
        itemId: id,
        itemName: String(a.itemName ?? b.itemName ?? 'Item'),
        oldSup: bSup,
        newSup: aSup,
      });
    }
  }
  return deltas;
}
