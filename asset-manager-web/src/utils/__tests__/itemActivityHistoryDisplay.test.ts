import { describe, it, expect } from 'vitest';
import type { ActivityLog } from '../../types/activityLog';
import { getItemHistoryPrimaryLine, getItemHistoryStockLines } from '../itemActivityHistoryDisplay';

function log(overrides: Partial<ActivityLog> & Pick<ActivityLog, 'actionType'>): ActivityLog {
  return {
    id: 'l1',
    timestamp: '2025-01-01',
    actorName: 'A',
    actorRole: 'Admin',
    actionType: 'update',
    targetType: 'item',
    targetId: 'i1',
    ...overrides,
  } as ActivityLog;
}

describe('itemActivityHistoryDisplay', () => {
  describe('getItemHistoryPrimaryLine', () => {
    it('prefers summary when present', () => {
      expect(
        getItemHistoryPrimaryLine(
          log({ actionType: 'update', summary: '  Did something  ', targetDisplay: 'Other' })
        )
      ).toBe('Did something');
    });

    it('falls back to targetDisplay then actionType', () => {
      expect(
        getItemHistoryPrimaryLine(log({ actionType: 'create', summary: '', targetDisplay: 'Item X' }))
      ).toBe('Item X');
      expect(
        getItemHistoryPrimaryLine(log({ actionType: 'delete', summary: '', targetDisplay: '  ' }))
      ).toBe('delete');
    });
  });

  describe('getItemHistoryStockLines', () => {
    it('builds central location line when location name indicates central store', () => {
      const lines = getItemHistoryStockLines(
        log({
          actionType: 'update',
          changes: [
            { field: 'quantity', oldValue: 5, newValue: 10 },
            { field: 'locationName', oldValue: 'Central Store', newValue: 'Central Store' },
          ],
        })
      );
      expect(lines[0]).toContain('Central store had');
      expect(lines[0]).toContain('5');
      expect(lines[0]).toContain('10');
    });

    it('includes centralStoreQuantity and atSitesQuantity lines', () => {
      const lines = getItemHistoryStockLines(
        log({
          actionType: 'update',
          changes: [
            { field: 'centralStoreQuantity', oldValue: 1, newValue: 2 },
            { field: 'atSitesQuantity', oldValue: 3, newValue: 4 },
          ],
        })
      );
      expect(lines.some((l) => l.includes('Central store had'))).toBe(true);
      expect(lines.some((l) => l.includes('At sites had'))).toBe(true);
    });

    it('returns empty array when no quantity-related changes', () => {
      expect(getItemHistoryStockLines(log({ actionType: 'create', changes: [] }))).toEqual([]);
    });
  });
});
