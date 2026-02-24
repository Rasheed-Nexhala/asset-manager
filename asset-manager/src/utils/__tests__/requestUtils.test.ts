import { getReturnHistoryForDisplay } from '../requestUtils';
import type { Request } from '../../types/request';

describe('requestUtils', () => {
  describe('getReturnHistoryForDisplay', () => {
    it('returns returnHistory when present', () => {
      const request: Request = {
        id: 'req1',
        requestNumber: 'R001',
        status: 'returned',
        items: [],
        returnHistory: [
          {
            returnId: 'ret1',
            returnedAt: '2025-02-24',
            returnedByName: 'John',
            items: [],
            returnNotes: null,
          },
        ],
      } as Request;
      const result = getReturnHistoryForDisplay(request);
      expect(result).toHaveLength(1);
      expect(result![0].returnId).toBe('ret1');
      expect(result![0].returnedByName).toBe('John');
    });

    it('returns legacy format when status is returned and returnItems exist', () => {
      const request: Request = {
        id: 'req1',
        requestNumber: 'R001',
        status: 'returned',
        items: [
          { itemId: 'i1', itemName: 'Item 1', quantityRequested: 5 } as never,
        ],
        returnItems: [
          { itemId: 'i1', quantityReturned: 3, condition: 'good' } as never,
        ],
        returnedAt: '2025-02-24',
        requestedByName: 'Jane',
      } as Request;
      const result = getReturnHistoryForDisplay(request);
      expect(result).toHaveLength(1);
      expect(result![0].returnId).toBe('legacy');
      expect(result![0].returnedByName).toBe('Jane');
      expect(result![0].items[0].itemName).toBe('Item 1');
      expect(result![0].items[0].quantityReturned).toBe(3);
    });

    it('returns null when no return history', () => {
      const request: Request = {
        id: 'req1',
        status: 'pending',
        items: [],
      } as Request;
      expect(getReturnHistoryForDisplay(request)).toBe(null);
    });
  });
});
