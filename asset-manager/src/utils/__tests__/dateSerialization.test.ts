import {
  dateToIso,
  isoToDate,
  filtersToStore,
  filtersToUI,
} from '../dateSerialization';

describe('dateSerialization', () => {
  describe('dateToIso', () => {
    it('converts Date to ISO string', () => {
      const d = new Date('2025-02-24T12:00:00.000Z');
      expect(dateToIso(d)).toBe('2025-02-24T12:00:00.000Z');
    });

    it('returns string unchanged when input is string', () => {
      expect(dateToIso('2025-02-24')).toBe('2025-02-24');
    });

    it('returns null for null or undefined', () => {
      expect(dateToIso(null)).toBe(null);
      expect(dateToIso(undefined)).toBe(null);
    });
  });

  describe('isoToDate', () => {
    it('converts ISO string to Date', () => {
      const result = isoToDate('2025-02-24T12:00:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(new Date('2025-02-24T12:00:00.000Z').getTime());
    });

    it('returns Date unchanged when input is Date', () => {
      const d = new Date();
      expect(isoToDate(d)).toBe(d);
    });

    it('returns null for null or undefined', () => {
      expect(isoToDate(null)).toBe(null);
      expect(isoToDate(undefined)).toBe(null);
    });

    it('returns null for invalid ISO string', () => {
      expect(isoToDate('not-a-date')).toBe(null);
    });
  });

  describe('filtersToStore', () => {
    it('converts Date filters to ISO strings', () => {
      const start = new Date('2025-02-01');
      const end = new Date('2025-02-28');
      const result = filtersToStore({ startDate: start, endDate: end });
      expect(result.startDate).toBe(start.toISOString());
      expect(result.endDate).toBe(end.toISOString());
    });

    it('preserves other filter fields', () => {
      const result = filtersToStore({
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        actionType: 'create',
      } as { startDate: Date; endDate: Date; actionType: string });
      expect(result.actionType).toBe('create');
    });
  });

  describe('filtersToUI', () => {
    it('converts ISO string filters to Date', () => {
      const result = filtersToUI({
        startDate: '2025-02-01T00:00:00.000Z',
        endDate: '2025-02-28T00:00:00.000Z',
      });
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
    });

    it('preserves other filter fields', () => {
      const result = filtersToUI({
        startDate: '2025-02-01',
        endDate: '2025-02-28',
        actionType: 'create',
      } as { startDate: string; endDate: string; actionType: string });
      expect(result.actionType).toBe('create');
    });
  });
});
