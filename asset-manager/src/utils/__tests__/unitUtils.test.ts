import { isDiscreteUnit, COMMON_UNITS, STEEL_MASTER_UNITS, normalizeUnitForDisplay } from '../unitUtils';

describe('unitUtils', () => {
  describe('isDiscreteUnit', () => {
    it('returns true for Pieces', () => {
      expect(isDiscreteUnit('Pieces')).toBe(true);
      expect(isDiscreteUnit('pieces')).toBe(true);
    });

    it('returns true for Bags, Sets, Boxes, Rolls', () => {
      expect(isDiscreteUnit('Bags')).toBe(true);
      expect(isDiscreteUnit('Sets')).toBe(true);
      expect(isDiscreteUnit('Boxes')).toBe(true);
      expect(isDiscreteUnit('Rolls')).toBe(true);
    });

    it('returns false for Kg, Ton, Meter, Liters', () => {
      expect(isDiscreteUnit('Kg')).toBe(false);
      expect(isDiscreteUnit('Ton (MT)')).toBe(false);
      expect(isDiscreteUnit('Meter')).toBe(false);
      expect(isDiscreteUnit('Liters')).toBe(false);
    });

    it('returns false for empty or unknown units', () => {
      expect(isDiscreteUnit('')).toBe(false);
      expect(isDiscreteUnit('unknown')).toBe(false);
      expect(isDiscreteUnit('Nos')).toBe(false);
      expect(isDiscreteUnit('Pair')).toBe(false);
    });

    it('handles case-insensitive comparison', () => {
      expect(isDiscreteUnit('BAGS')).toBe(true);
      expect(isDiscreteUnit('boxes')).toBe(true);
    });
  });

  describe('COMMON_UNITS', () => {
    it('includes expected construction/inventory units', () => {
      expect(COMMON_UNITS).toContain('Pcs');
      expect(COMMON_UNITS).toContain('Kg');
      expect(COMMON_UNITS).toContain('Ton (MT)');
      expect(COMMON_UNITS).toContain('Bag');
      expect(COMMON_UNITS).toContain('Box');
      expect(COMMON_UNITS).toContain('Set');
      expect(COMMON_UNITS).toContain('Roll');
    });
  });

  describe('STEEL_MASTER_UNITS', () => {
    it('includes Pcs, Kg, Ton (MT) only', () => {
      expect(STEEL_MASTER_UNITS).toEqual(['Pcs', 'Kg', 'Ton (MT)']);
    });
  });

  describe('normalizeUnitForDisplay', () => {
    it('normalizes Pcs and Pieces to Pcs', () => {
      expect(normalizeUnitForDisplay('Pcs')).toBe('Pcs');
      expect(normalizeUnitForDisplay('pieces')).toBe('Pcs');
      expect(normalizeUnitForDisplay('Pieces')).toBe('Pcs');
    });

    it('returns empty string as "units"', () => {
      expect(normalizeUnitForDisplay('')).toBe('units');
    });

    it('preserves other units', () => {
      expect(normalizeUnitForDisplay('Kg')).toBe('Kg');
      expect(normalizeUnitForDisplay('Bag')).toBe('Bag');
    });
  });
});
