/**
 * Unit tests for weight conversion utilities
 */
import { describe, it, expect } from 'vitest';
import {
  tonToKg,
  isWeightBasedItem,
  isWeightViewSupported,
  piecesToKg,
  kgToPieces,
  getConversionErrorMessage,
  formatWeight,
} from '../weightConversionUtils';

describe('tonToKg', () => {
  it('converts ton to kg (1 ton = 1000 kg)', () => {
    expect(tonToKg(1)).toBe(1000);
    expect(tonToKg(2.5)).toBe(2500);
    expect(tonToKg(0)).toBe(0);
  });
});

describe('isWeightBasedItem', () => {
  it('returns true when weightPerMeter is positive number', () => {
    expect(isWeightBasedItem({ weightPerMeter: 10 })).toBe(true);
    expect(isWeightBasedItem({ weightPerMeter: 0.5 })).toBe(true);
  });

  it('returns false when weightPerMeter is 0 or missing', () => {
    expect(isWeightBasedItem({ weightPerMeter: 0 })).toBe(false);
    expect(isWeightBasedItem({})).toBe(false);
    expect(isWeightBasedItem({ weightPerMeter: undefined })).toBe(false);
  });

  it('returns false for null/undefined item', () => {
    expect(isWeightBasedItem(null as any)).toBe(false);
  });
});

describe('isWeightViewSupported', () => {
  it('returns true when both weightPerMeter and lengthPerPiece are positive', () => {
    expect(
      isWeightViewSupported({ weightPerMeter: 10, lengthPerPiece: 6 })
    ).toBe(true);
  });

  it('returns false when weightPerMeter is 0', () => {
    expect(
      isWeightViewSupported({ weightPerMeter: 0, lengthPerPiece: 6 })
    ).toBe(false);
  });

  it('returns false when lengthPerPiece is 0 or missing', () => {
    expect(
      isWeightViewSupported({ weightPerMeter: 10, lengthPerPiece: 0 })
    ).toBe(false);
    expect(isWeightViewSupported({ weightPerMeter: 10 })).toBe(false);
  });
});

describe('piecesToKg', () => {
  it('calculates weight from pieces', () => {
    // 10 pieces × 6m × 2 kg/m = 120 kg
    expect(piecesToKg(10, 2, 6)).toBe(120);
  });

  it('returns 0 when weightPerMeter or lengthPerPiece is 0 or negative', () => {
    expect(piecesToKg(10, 0, 6)).toBe(0);
    expect(piecesToKg(10, 2, 0)).toBe(0);
    expect(piecesToKg(10, -1, 6)).toBe(0);
  });
});

describe('kgToPieces', () => {
  it('returns exact result when kg divides evenly', () => {
    // 120 kg / (2 kg/m × 6 m) = 10 pieces
    const result = kgToPieces(120, 2, 6);
    expect(result.isExact).toBe(true);
    expect(result.pieces).toBe(10);
    expect(result.actualKg).toBe(120);
  });

  it('returns inexact result with suggestions when kg does not divide evenly', () => {
    // 100 kg / (2 × 6) = 8.33... pieces
    const result = kgToPieces(100, 2, 6);
    expect(result.isExact).toBe(false);
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions![0].pieces).toBe(8);
    expect(result.suggestions![0].kg).toBe(96); // 8 × 12
    expect(result.suggestions![1].pieces).toBe(9);
    expect(result.suggestions![1].kg).toBe(108); // 9 × 12
  });

  it('returns zero result when weightPerPiece is 0', () => {
    const result = kgToPieces(100, 0, 6);
    expect(result.isExact).toBe(false);
    expect(result.pieces).toBe(0);
  });
});

describe('getConversionErrorMessage', () => {
  it('returns empty string for exact conversion', () => {
    const msg = getConversionErrorMessage(120, 2, 6);
    expect(msg).toBe('');
  });

  it('returns error message with suggestions for inexact conversion', () => {
    const msg = getConversionErrorMessage(100, 2, 6);
    expect(msg).toContain('Cannot convert');
    expect(msg).toContain('100 kg');
    expect(msg).toContain('weight per piece');
    expect(msg).toContain('12 kg');
    expect(msg).toContain('8 pieces');
    expect(msg).toContain('9 pieces');
  });
});

describe('formatWeight', () => {
  it('formats kg in Kg unit', () => {
    const result = formatWeight(100, 'Kg');
    expect(result).toContain('100');
    expect(result).toContain('Kg');
  });

  it('formats kg in Ton (MT) when >= 1000', () => {
    const result = formatWeight(2000, 'Ton (MT)');
    expect(result).toContain('2');
    expect(result).toContain('Ton');
  });

  it('formats kg in Kg when < 1000 when unit is Ton (MT)', () => {
    const result = formatWeight(500, 'Ton (MT)');
    expect(result).toContain('500');
    expect(result).toContain('Kg');
  });
});
