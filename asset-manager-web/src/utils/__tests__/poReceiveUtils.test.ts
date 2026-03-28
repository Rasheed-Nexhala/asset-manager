import {
  mapPoItemsAfterReceive,
  normalizeOrderedQuantity,
  normalizePreviousReceived,
} from '../poReceiveUtils';

describe('poReceiveUtils', () => {
  describe('normalizeOrderedQuantity', () => {
    it('returns 0 for undefined and invalid values', () => {
      expect(normalizeOrderedQuantity(undefined)).toBe(0);
      expect(normalizeOrderedQuantity(NaN)).toBe(0);
      expect(normalizeOrderedQuantity(-1)).toBe(0);
    });

    it('parses numeric strings', () => {
      expect(normalizeOrderedQuantity('100')).toBe(100);
    });
  });

  describe('normalizePreviousReceived', () => {
    it('coerces string receivedQuantity to number (avoids concat bug)', () => {
      expect(normalizePreviousReceived('10')).toBe(10);
    });
  });

  describe('mapPoItemsAfterReceive', () => {
    it('adds string previous received and new receipt as numeric total', () => {
      const items = [
        { itemId: 'a', itemName: 'A', quantity: 100, receivedQuantity: '10' },
      ];
      const receivedByQty = new Map([['a', 5]]);
      const { updatedItems, allFullyReceived } = mapPoItemsAfterReceive(
        items,
        receivedByQty
      );
      expect(updatedItems[0].receivedQuantity).toBe(15);
      expect(allFullyReceived).toBe(false);
    });

    it('marks full when every line meets ordered qty after receipt', () => {
      const items = [
        { itemId: 'a', quantity: 10, receivedQuantity: 0 },
        { itemId: 'b', quantity: 10, receivedQuantity: 0 },
      ];
      const receivedByQty = new Map([
        ['a', 10],
        ['b', 10],
      ]);
      const { allFullyReceived, updatedItems } = mapPoItemsAfterReceive(
        items,
        receivedByQty
      );
      expect(allFullyReceived).toBe(true);
      expect(updatedItems[0].receivedQuantity).toBe(10);
      expect(updatedItems[1].receivedQuantity).toBe(10);
    });

    it('stays partial when one line is excess but another is short', () => {
      const items = [
        { itemId: 'a', quantity: 10, receivedQuantity: 0 },
        { itemId: 'b', quantity: 10, receivedQuantity: 0 },
      ];
      const receivedByQty = new Map([
        ['a', 15],
        ['b', 3],
      ]);
      const { allFullyReceived, updatedItems } = mapPoItemsAfterReceive(
        items,
        receivedByQty
      );
      expect(allFullyReceived).toBe(false);
      expect(updatedItems[0].receivedQuantity).toBe(15);
      expect(updatedItems[1].receivedQuantity).toBe(3);
    });

    it('treats missing ordered quantity as 0 so line is fulfilled (legacy data)', () => {
      const items = [{ itemId: 'x', receivedQuantity: 0 }];
      const receivedByQty = new Map([['x', 1]]);
      const { allFullyReceived } = mapPoItemsAfterReceive(items, receivedByQty);
      expect(allFullyReceived).toBe(true);
    });
  });
});
