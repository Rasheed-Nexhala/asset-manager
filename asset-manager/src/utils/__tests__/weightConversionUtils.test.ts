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

    it('formats zero correctly', () => {
      expect(formatWeight(0, 'Kg')).toContain('0');
      expect(formatWeight(0, 'Ton (MT)')).toContain('0');
    });

    it('formats decimal kg with locale', () => {
      const result = formatWeight(1234.56, 'Kg');
      expect(result).toMatch(/\d[\d,]*\.?\d*\s*Kg/);
    });
  });

  describe('Ton → Kg → Pieces conversion flow', () => {
    it('converts 1 Ton to 1000 kg, then to pieces when weightPerPiece is 30', () => {
      const kg = tonToKg(1);
      expect(kg).toBe(1000);
      const result = kgToPieces(kg, 5, 6); // 30 kg per piece
      expect(result.isExact).toBe(false); // 1000/30 = 33.33...
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions![0].pieces).toBe(33);
      expect(result.suggestions![1].pieces).toBe(34);
    });

    it('converts 3 Ton to exact pieces when weightPerPiece divides evenly', () => {
      const kg = tonToKg(3); // 3000 kg
      const result = kgToPieces(kg, 5, 6); // 30 kg per piece → 3000/30 = 100
      expect(result.isExact).toBe(true);
      expect(result.pieces).toBe(100);
    });
  });

  describe('kgToPieces edge cases', () => {
    it('handles floating-point precision (0.1 + 0.2 style)', () => {
      const result = kgToPieces(90.00000000000001, 5, 6); // ~90, should be 3 pieces
      expect(result.isExact).toBe(true);
      expect(result.pieces).toBe(3);
    });

    it('handles very small weightPerPiece', () => {
      const result = kgToPieces(0.001, 0.001, 1);
      expect(result.pieces).toBe(1);
      expect(result.isExact).toBe(true);
    });

    it('suggestions include floor and ceil when inexact', () => {
      const result = kgToPieces(50, 5, 6); // 50/30 = 1.66...
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions![0].pieces).toBe(1);
      expect(result.suggestions![0].kg).toBe(30);
      expect(result.suggestions![1].pieces).toBe(2);
      expect(result.suggestions![1].kg).toBe(60);
    });
  });

  describe('piecesToKg edge cases', () => {
    it('handles zero pieces', () => {
      expect(piecesToKg(0, 5, 6)).toBe(0);
    });

    it('handles single piece', () => {
      expect(piecesToKg(1, 5, 6)).toBe(30);
    });

    it('handles decimal weightPerMeter', () => {
      expect(piecesToKg(10, 2.5, 6)).toBe(150); // 10 * 6 * 2.5
    });
  });
});
