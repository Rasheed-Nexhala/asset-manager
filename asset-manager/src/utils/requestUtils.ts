import type { Request } from '../types/request';

/**
 * Return history event shape for display (supports both new and legacy formats)
 */
export interface ReturnHistoryItem {
  returnId: string;
  returnedAt: unknown;
  returnedByName: string;
  items: Array<{
    itemId: string;
    itemName: string;
    quantityReturned: number;
    condition: string;
    cumulativeReturned?: number;
  }>;
  returnNotes: string | null;
}

/**
 * Get return history for display, handling both new (returnHistory) and
 * legacy (returnItems) format for backward compatibility.
 */
export function getReturnHistoryForDisplay(request: Request): ReturnHistoryItem[] | null {
  if (request.returnHistory && request.returnHistory.length > 0) {
    return request.returnHistory as ReturnHistoryItem[];
  }
  // Legacy: single return stored in returnItems
  if (
    request.status === 'returned' &&
    request.returnItems &&
    request.returnItems.length > 0
  ) {
    const items = request.returnItems.map((ri) => {
      const item = request.items.find((i) => i.itemId === ri.itemId);
      return {
        itemId: ri.itemId,
        itemName: item?.itemName ?? ri.itemId,
        quantityReturned: ri.quantityReturned,
        condition: ri.condition,
        cumulativeReturned: ri.quantityReturned,
      };
    });
    return [
      {
        returnId: 'legacy',
        returnedAt: request.returnedAt,
        returnedByName: request.requestedByName ?? 'Unknown',
        items,
        returnNotes: request.returnNotes ?? null,
      },
    ];
  }
  return null;
}
