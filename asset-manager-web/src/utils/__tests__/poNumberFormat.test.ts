import { describe, it, expect } from 'vitest';
import {
  formatIbfPoNumber,
  getIndianFinancialYearCounterDocId,
  getIndianFinancialYearLabel,
} from '../poNumberFormat';

describe('poNumberFormat', () => {
  describe('getIndianFinancialYearLabel', () => {
    it('uses 2026-27 on or after April 1', () => {
      expect(getIndianFinancialYearLabel(new Date(2026, 3, 1))).toBe('2026-27');
      expect(getIndianFinancialYearLabel(new Date(2026, 11, 31))).toBe('2026-27');
    });

    it('uses 2025-26 before April 1', () => {
      expect(getIndianFinancialYearLabel(new Date(2026, 2, 31))).toBe('2025-26');
      expect(getIndianFinancialYearLabel(new Date(2026, 0, 15))).toBe('2025-26');
    });
  });

  describe('getIndianFinancialYearCounterDocId', () => {
    it('matches label as safe doc id', () => {
      expect(getIndianFinancialYearCounterDocId(new Date(2026, 3, 1))).toBe('fy_2026_27');
      expect(getIndianFinancialYearCounterDocId(new Date(2026, 2, 15))).toBe('fy_2025_26');
    });
  });

  describe('formatIbfPoNumber', () => {
    it('pads sequence to 3 digits', () => {
      expect(formatIbfPoNumber('2026-27', 1)).toBe('IBF/PO/2026-27/001');
      expect(formatIbfPoNumber('2026-27', 42)).toBe('IBF/PO/2026-27/042');
    });
  });
});
