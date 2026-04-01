/**
 * Pure partition logic for partial approval (unit-tested without Firebase).
 */

export type LineItem = {
  itemId: string;
  itemName?: string;
  itemSku?: string;
  unit?: string;
  itemType?: string;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string | null;
  quantityRequested: number;
  quantityApproved?: number;
  quantityReturned?: number;
  status?: string;
  weightPerMeter?: number | null;
  lengthPerPiece?: number | null;
};

export type ApprovedLineInput = { itemId: string; quantityApproved: number };

/** Partitions parent lines into fulfill vs remainder for partial approval. */
export function partitionPartialApproval(
  parentItems: LineItem[],
  approvedLineItems: ApprovedLineInput[]
): {
  fulfillLines: LineItem[];
  remainderLines: LineItem[];
  error?: string;
} {
  const approvedMap = new Map<string, number>();
  for (const row of approvedLineItems) {
    if (!row.itemId || typeof row.quantityApproved !== 'number') {
      return { fulfillLines: [], remainderLines: [], error: 'Invalid approvedLineItems entry' };
    }
    if (approvedMap.has(row.itemId)) {
      return { fulfillLines: [], remainderLines: [], error: 'Duplicate itemId in approvedLineItems' };
    }
    approvedMap.set(row.itemId, row.quantityApproved);
  }

  const fulfillLines: LineItem[] = [];
  const remainderLines: LineItem[] = [];

  for (const line of parentItems) {
    const qr = line.quantityRequested;
    if (typeof qr !== 'number' || qr <= 0) {
      return { fulfillLines: [], remainderLines: [], error: `Invalid quantityRequested for ${line.itemId}` };
    }
    const approvedQty = approvedMap.get(line.itemId) ?? 0;
    if (approvedQty < 0 || approvedQty > qr) {
      return {
        fulfillLines: [],
        remainderLines: [],
        error: `Invalid approved quantity for ${line.itemName ?? line.itemId}`,
      };
    }
    if (approvedQty === 0) {
      remainderLines.push({
        ...line,
        quantityRequested: qr,
        quantityApproved: qr,
        quantityReturned: 0,
        status: 'pending',
      });
      continue;
    }
    fulfillLines.push({
      ...line,
      quantityRequested: approvedQty,
      quantityApproved: approvedQty,
      quantityReturned: 0,
      status: 'pending',
    });
    const rem = qr - approvedQty;
    if (rem > 0) {
      remainderLines.push({
        ...line,
        quantityRequested: rem,
        quantityApproved: rem,
        quantityReturned: 0,
        status: 'pending',
      });
    }
  }

  if (fulfillLines.length === 0) {
    return { fulfillLines: [], remainderLines: [], error: 'Select at least one line to approve' };
  }

  return { fulfillLines, remainderLines };
}
