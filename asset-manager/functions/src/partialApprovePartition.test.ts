import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { partitionPartialApproval } from './partialApprovePartition.js';

const baseLine = (overrides: Record<string, unknown>) => ({
  itemId: 'a',
  itemName: 'Item A',
  itemSku: 'SKU1',
  itemType: 'consumable',
  categoryId: 'c1',
  categoryName: 'Cat',
  quantityRequested: 10,
  quantityApproved: 10,
  quantityReturned: 0,
  status: 'pending',
  ...overrides,
});

describe('partitionPartialApproval', () => {
  it('splits one line partial into fulfill and remainder', () => {
    const parentItems = [baseLine({ itemId: 'x', quantityRequested: 10 })];
    const r = partitionPartialApproval(parentItems, [
      { itemId: 'x', quantityApproved: 4 },
    ]);
    assert.equal(r.error, undefined);
    assert.equal(r.fulfillLines.length, 1);
    assert.equal(r.fulfillLines[0].quantityRequested, 4);
    assert.equal(r.remainderLines.length, 1);
    assert.equal(r.remainderLines[0].quantityRequested, 6);
  });

  it('moves full line to remainder when approved qty is 0', () => {
    const parentItems = [
      baseLine({ itemId: 'a', quantityRequested: 5 }),
      baseLine({ itemId: 'b', quantityRequested: 3 }),
    ];
    const r = partitionPartialApproval(parentItems, [{ itemId: 'a', quantityApproved: 5 }]);
    assert.equal(r.fulfillLines.length, 1);
    assert.equal(r.remainderLines.length, 1);
    assert.equal(r.remainderLines[0].itemId, 'b');
    assert.equal(r.remainderLines[0].quantityRequested, 3);
  });

  it('errors when approved exceeds requested', () => {
    const r = partitionPartialApproval(
      [baseLine({ itemId: 'a', quantityRequested: 2 })],
      [{ itemId: 'a', quantityApproved: 9 }]
    );
    assert.ok(r.error);
  });

  it('errors when no line has positive approval', () => {
    const r = partitionPartialApproval(
      [baseLine({ itemId: 'a', quantityRequested: 2 })],
      [{ itemId: 'a', quantityApproved: 0 }]
    );
    assert.ok(r.error);
  });
});
