import {
  TON_TO_KG,
  tonToKg,
  isWeightBasedItem,
  isWeightViewSupported,
  piecesToKg,
  kgToPieces,
  getConversionErrorMessage,
  calculateTotalWeight,
  formatWeight,
} from '../weightConversionUtils';

describe('weightConversionUtils', () => {
  describe('TON_TO_KG', () => {
    it('equals 1000', () => {
      expect(TON_TO_KG).toBe(1000);
    });
  });

  describe('tonToKg', () => {
    it('converts ton to kg', () => {
      expect(tonToKg(1)).toBe(1000);
      expect(tonToKg(2.5)).toBe(2500);
    });
  });

  describe('isWeightBasedItem', () => {
    it('returns true when weightPerMeter is positive', () => {
      expect(isWeightBasedItem({ weightPerMeter: 5 })).toBe(true);
    });

    it('returns false when weightPerMeter is missing or zero', () => {
      expect(isWeightBasedItem({})).toBe(false);
      expect(isWeightBasedItem({ weightPerMeter: 0 })).toBe(false);
    });
  });

  describe('isWeightViewSupported', () => {
    it('returns true when both weightPerMeter and lengthPerPiece are positive', () => {
      expect(
        isWeightViewSupported({ weightPerMeter: 5, lengthPerPiece: 6 })
      ).toBe(true);
    });

    it('returns false when lengthPerPiece is missing or zero', () => {
      expect(isWeightViewSupported({ weightPerMeter: 5 })).toBe(false);
      expect(
        isWeightViewSupported({ weightPerMeter: 5, lengthPerPiece: 0 })
      ).toBe(false);
    });
  });

  describe('piecesToKg', () => {
    it('calculates weight from pieces', () => {
      expect(piecesToKg(10, 5, 6)).toBe(300); // 10 * 6 * 5 = 300
    });

    it('returns 0 when weightPerMeter or lengthPerPiece is <= 0', () => {
      expect(piecesToKg(10, 0, 6)).toBe(0);
      expect(piecesToKg(10, 5, 0)).toBe(0);
    });
  });

  describe('kgToPieces', () => {
    it('returns exact pieces when kg divides evenly', () => {
      const result = kgToPieces(300, 5, 6); // 300 / 30 = 10
      expect(result.isExact).toBe(true);
      expect(result.pieces).toBe(10);
      expect(result.actualKg).toBe(300);
      expect(result.weightPerPiece).toBe(30);
    });

    it('returns inexact with suggestions when kg does not divide evenly', () => {
      const result = kgToPieces(100, 5, 6); // 100/30 = 3.33...
      expect(result.isExact).toBe(false);
      expect(result.suggestions).toEqual([
        { pieces: 3, kg: 90 },
        { pieces: 4, kg: 120 },
      ]);
    });

    it('returns zero pieces when weightPerPiece is 0', () => {
      const result = kgToPieces(100, 0, 6);
      expect(result.pieces).toBe(0);
      expect(result.isExact).toBe(false);
    });
  });

  describe('getConversionErrorMessage', () => {
    it('returns empty string when conversion is exact', () => {
      expect(getConversionErrorMessage(300, 5, 6)).toBe('');
    });

    it('returns message with suggestions when conversion is inexact', () => {
      const msg = getConversionErrorMessage(100, 5, 6);
      expect(msg).toContain('Cannot convert');
      expect(msg).toContain('100');
      expect(msg).toContain('30');
      expect(msg).toContain('3 pieces');
      expect(msg).toContain('4 pieces');
    });
  });

  describe('calculateTotalWeight', () => {
    it('calculates total weight', () => {
      expect(calculateTotalWeight(10, 5, 6)).toBe(300);
    });
  });

  describe('formatWeight', () => {
    it('formats in Kg unit', () => {
      expect(formatWeight(1500, 'Kg')).toContain('1,500');
      expect(formatWeight(1500, 'Kg')).toContain('Kg');
    });

    it('formats in Ton when unit is Ton (MT) and kg >= 1000', () => {
      const result = formatWeight(2000, 'Ton (MT)');
      expect(result).toContain('Ton');
      expect(result).toContain('2');
    });

    it('formats in Kg when unit is Ton but kg < 1000', () => {
      const result = formatWeight(500, 'Ton (MT)');
      expect(result).toContain('Kg');
      expect(result).toContain('500');
    });
  });
});
