import { describe, it, expect } from 'vitest';
import { filterVehiclesBySearch, normalizeVehicleNumber, vehicleMatchesSearch } from '../vehicleNumberUtils';

describe('normalizeVehicleNumber', () => {
  it('trims and lowercases', () => {
    expect(normalizeVehicleNumber('  TN-10-XY-1  ')).toBe('tn-10-xy-1');
  });
});

describe('vehicleMatchesSearch', () => {
  it('matches vehicle number case-insensitively', () => {
    expect(vehicleMatchesSearch({ vehicleNumber: 'KA-01-AB-1' }, 'ka-01')).toBe(true);
    expect(vehicleMatchesSearch({ vehicleNumber: 'KA-01-AB-1' }, 'ZZ')).toBe(false);
  });

  it('matches notes', () => {
    expect(vehicleMatchesSearch({ vehicleNumber: 'X', notes: 'Tipper truck' }, 'tipper')).toBe(true);
  });
});

describe('filterVehiclesBySearch', () => {
  it('returns all when query is empty', () => {
    const v = [{ vehicleNumber: 'A' }, { vehicleNumber: 'B' }];
    expect(filterVehiclesBySearch(v, '   ')).toEqual(v);
  });

  it('filters by number or notes', () => {
    const v = [
      { vehicleNumber: 'MH-1', notes: '' },
      { vehicleNumber: 'KA-2', notes: 'Fuel card' },
    ];
    expect(filterVehiclesBySearch(v, 'mh')).toHaveLength(1);
    expect(filterVehiclesBySearch(v, 'fuel')).toHaveLength(1);
  });
});
