/**
 * PO receipt line math: safe numeric coercion for Firestore / legacy data
 * (avoids string concatenation on + and undefined ordered quantity edge cases).
 */

/** Ordered quantity on a PO line; invalid/missing values become 0. */
export function normalizeOrderedQuantity(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Previously received quantity on a PO line; invalid/missing values become 0. */
export function normalizePreviousReceived(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Computes updated line items and whether every line has met or exceeded ordered qty.
 * Excess (totalReceived > orderedQty) still counts as fulfilled for that line.
 */
export function mapPoItemsAfterReceive(
  items: any[],
  receivedByQty: Map<string, number>
): { updatedItems: any[]; allFullyReceived: boolean } {
  let allFullyReceived = true;
  const updatedItems = items.map((item: any) => {
    const newlyReceived = receivedByQty.get(item.itemId) ?? 0;
    const prev = normalizePreviousReceived(item.receivedQuantity);
    const orderedQty = normalizeOrderedQuantity(item.quantity);
    const totalReceived = prev + newlyReceived;
    if (totalReceived < orderedQty) {
      allFullyReceived = false;
    }
    return {
      ...item,
      receivedQuantity: totalReceived,
    };
  });
  return { updatedItems, allFullyReceived };
}
