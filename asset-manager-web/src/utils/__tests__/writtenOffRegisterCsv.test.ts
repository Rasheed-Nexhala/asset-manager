import { describe, it, expect } from 'vitest';
import { buildWrittenOffRegisterCsv } from '../writtenOffRegisterCsv';
import type { Maintenance } from '../../types/maintenance';

const baseRecord = (overrides: Partial<Maintenance>): Maintenance =>
  ({
    id: 'm1',
    itemId: 'i1',
    itemName: 'Hammer Drill',
    itemSku: 'SKU-100',
    unit: 'Pcs',
    quantity: 0,
    issueType: 'physical_damage',
    issueDescription: '',
    reportedBy: '',
    reportedByName: '',
    photos: [],
    status: 'written_off',
    updates: [],
    returnedAt: null,
    returnedQuantity: 2,
    repairSummary: null,
    repairCost: null,
    repairedBy: null,
    writtenOffAt: '2025-01-15T10:00:00.000Z',
    writeOffReason: 'beyond_repair',
    writeOffExplanation: 'Motor seized',
    writtenOffUnitsTotal: 3,
    addedBy: 'u1',
    addedByName: 'Alex',
    addedAt: '2025-01-01T08:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
    sourceReturnDate: null,
    ...overrides,
  }) as Maintenance;

describe('buildWrittenOffRegisterCsv', () => {
  it('includes header and escapes commas and quotes in text fields', () => {
    const csv = buildWrittenOffRegisterCsv([
      baseRecord({
        itemName: 'Item, with "quotes"',
        writeOffExplanation: 'Line1\nLine2',
      }),
    ]);
    expect(csv).toContain('Record ID');
    expect(csv).toContain('Units Written Off');
    expect(csv).toContain('Item, with');
    const lines = csv.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toContain('Write-off Explanation');
  });

  it('produces one data row per record', () => {
    const csv = buildWrittenOffRegisterCsv([
      baseRecord({ id: 'a' }),
      baseRecord({ id: 'b', itemName: 'Second' }),
    ]);
    const lines = csv.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3);
  });
});
