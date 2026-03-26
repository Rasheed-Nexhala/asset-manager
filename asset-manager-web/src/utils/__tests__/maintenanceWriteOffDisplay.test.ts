import { describe, it, expect } from 'vitest';
import { getDisplayWrittenOffUnits } from '../maintenanceWriteOffDisplay';
import type { Maintenance } from '../../types/maintenance';

const minimal = (overrides: Partial<Maintenance>): Maintenance =>
  ({
    id: 'm1',
    itemId: 'i1',
    itemName: 'X',
    itemSku: 'S',
    quantity: 0,
    issueType: 'other',
    issueDescription: '',
    reportedBy: '',
    reportedByName: '',
    photos: [],
    status: 'written_off',
    updates: [],
    returnedAt: null,
    returnedQuantity: null,
    repairSummary: null,
    repairCost: null,
    repairedBy: null,
    writtenOffAt: '2025-01-01',
    writeOffReason: 'beyond_repair',
    writeOffExplanation: null,
    addedBy: 'u',
    addedByName: 'U',
    addedAt: '2025-01-01',
    updatedAt: '2025-01-01',
    sourceReturnDate: null,
    ...overrides,
  }) as Maintenance;

describe('getDisplayWrittenOffUnits', () => {
  it('uses writtenOffUnitsTotal when set', () => {
    expect(
      getDisplayWrittenOffUnits(
        minimal({ writtenOffUnitsTotal: 5, updates: [] })
      )
    ).toBe(5);
  });

  it('sums Written off N items. notes when total field missing', () => {
    expect(
      getDisplayWrittenOffUnits(
        minimal({
          writtenOffUnitsTotal: undefined,
          updates: [
            {
              note: 'Written off 2 items. Reason: beyond_repair.',
              addedBy: 'a',
              addedByName: 'A',
              addedAt: '2025-01-01',
            },
            {
              note: 'Written off 3 items. Reason: obsolete.',
              addedBy: 'a',
              addedByName: 'A',
              addedAt: '2025-01-02',
            },
          ],
        })
      )
    ).toBe(5);
  });

  it('returns null when no total and no matching notes', () => {
    expect(
      getDisplayWrittenOffUnits(
        minimal({ writtenOffUnitsTotal: undefined, updates: [] })
      )
    ).toBeNull();
  });
});
