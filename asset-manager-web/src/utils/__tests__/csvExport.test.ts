import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDateForCsv, saveCsvAndShare } from '../csvExport';

describe('csvExport', () => {
  describe('formatDateForCsv', () => {
    it('returns empty string for null and undefined', () => {
      expect(formatDateForCsv(null)).toBe('');
      expect(formatDateForCsv(undefined)).toBe('');
    });

    it('formats a valid Date', () => {
      const d = new Date(2024, 5, 15, 14, 30, 0);
      const s = formatDateForCsv(d);
      expect(s.length).toBeGreaterThan(0);
      expect(s).toMatch(/2024/);
    });

    it('formats an ISO string', () => {
      const s = formatDateForCsv('2024-06-15T14:30:00.000Z');
      expect(s.length).toBeGreaterThan(0);
      expect(s).toMatch(/2024/);
    });

    it('returns empty for invalid date string', () => {
      expect(formatDateForCsv('not-a-date')).toBe('');
    });

    it('handles Firestore-like object with toDate()', () => {
      const s = formatDateForCsv({
        toDate: () => new Date('2023-01-01T10:00:00.000Z'),
      });
      expect(s.length).toBeGreaterThan(0);
      expect(s).toMatch(/2023/);
    });

    it('handles plain seconds / nanoseconds shape', () => {
      const s = formatDateForCsv({
        seconds: 1700000000,
        nanoseconds: 500000000,
      });
      expect(s.length).toBeGreaterThan(0);
    });
  });

  describe('saveCsvAndShare', () => {
    let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let createElementSpy: ReturnType<typeof vi.spyOn>;
    let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const realCreate = document.createElement.bind(document);
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement;
        return realCreate(tag);
      });
    });

    afterEach(() => {
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
      createElementSpy.mockRestore();
    });

    it('creates blob URL, builds anchor, triggers click, revokes URL', async () => {
      await saveCsvAndShare('col1,col2\nval1,val2', 'test-export');

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe('blob:mock-url');
      expect(mockAnchor.download).toMatch(/^test-export-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(mockAnchor.click).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('uses default filename when not provided', async () => {
      await saveCsvAndShare('data');

      expect(mockAnchor.download).toMatch(/^export-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(mockAnchor.click).toHaveBeenCalled();
    });
  });
});
