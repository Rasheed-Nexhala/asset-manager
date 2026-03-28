import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  analyzeSupervisorCustodyItemsChange,
  findSupervisorCustodyDeltas,
} from './supervisorCustodyActivity';

describe('analyzeSupervisorCustodyItemsChange', () => {
  it('returns isSupervisorOnly true when only supervisorOutstandingQty changes on all lines', () => {
    const before = [
      {
        itemId: 'i1',
        itemName: 'Cement',
        quantityApproved: 10,
        supervisorOutstandingQty: 0,
      },
    ];
    const after = [
      {
        itemId: 'i1',
        itemName: 'Cement',
        quantityApproved: 10,
        supervisorOutstandingQty: 3,
      },
    ];
    const r = analyzeSupervisorCustodyItemsChange(before, after);
    assert.equal(r.isSupervisorOnly, true);
    assert.equal(r.deltas.length, 1);
    assert.deepEqual(r.deltas[0], {
      itemId: 'i1',
      itemName: 'Cement',
      oldSup: 0,
      newSup: 3,
    });
  });

  it('returns isSupervisorOnly false when line count differs', () => {
    const before = [{ itemId: 'i1', supervisorOutstandingQty: 0 }];
    const after = [
      { itemId: 'i1', supervisorOutstandingQty: 1 },
      { itemId: 'i2', supervisorOutstandingQty: 0 },
    ];
    const r = analyzeSupervisorCustodyItemsChange(before, after);
    assert.equal(r.isSupervisorOnly, false);
    assert.equal(r.deltas.length, 0);
  });

  it('returns isSupervisorOnly false when another field on a line changes', () => {
    const before = [
      { itemId: 'i1', itemName: 'A', quantityApproved: 5, supervisorOutstandingQty: 0 },
    ];
    const after = [
      { itemId: 'i1', itemName: 'A', quantityApproved: 6, supervisorOutstandingQty: 0 },
    ];
    const r = analyzeSupervisorCustodyItemsChange(before, after);
    assert.equal(r.isSupervisorOnly, false);
  });

  it('returns isSupervisorOnly false when sup qty unchanged (no deltas)', () => {
    const line = { itemId: 'i1', itemName: 'X', supervisorOutstandingQty: 2 };
    const r = analyzeSupervisorCustodyItemsChange([line], [{ ...line }]);
    assert.equal(r.isSupervisorOnly, false);
    assert.equal(r.deltas.length, 0);
  });

  it('handles non-array items as empty', () => {
    const r = analyzeSupervisorCustodyItemsChange(null, []);
    assert.equal(r.isSupervisorOnly, false);
  });
});

describe('findSupervisorCustodyDeltas', () => {
  it('lists deltas even when other line fields also differ', () => {
    const before = [
      { itemId: 'i1', quantityApproved: 5, supervisorOutstandingQty: 0 },
    ];
    const after = [
      { itemId: 'i1', quantityApproved: 6, supervisorOutstandingQty: 2 },
    ];
    const d = findSupervisorCustodyDeltas(before, after);
    assert.equal(d.length, 1);
    assert.equal(d[0].oldSup, 0);
    assert.equal(d[0].newSup, 2);
  });

  it('skips lines missing in after map', () => {
    const before = [
      { itemId: 'i1', supervisorOutstandingQty: 1 },
      { itemId: 'i2', supervisorOutstandingQty: 0 },
    ];
    const after = [{ itemId: 'i1', supervisorOutstandingQty: 2 }];
    const d = findSupervisorCustodyDeltas(before, after);
    assert.equal(d.length, 1);
    assert.equal(d[0].itemId, 'i1');
  });
});
