import { filterVehiclesBySearch, normalizeVehicleNumber, vehicleMatchesSearch } from '../vehicleNumberUtils';

describe('normalizeVehicleNumber', () => {
  it('trims and lowercases', () => {
    expect(normalizeVehicleNumber('  KA-01-AB-999  ')).toBe('ka-01-ab-999');
  });

  it('handles empty string', () => {
    expect(normalizeVehicleNumber('   ')).toBe('');
  });
});

describe('filterVehiclesBySearch', () => {
  it('filters by number or notes', () => {
    const v = [
      { vehicleNumber: 'MH-1', notes: '' },
      { vehicleNumber: 'KA-2', notes: 'Tipper' },
    ];
    expect(filterVehiclesBySearch(v, 'mh')).toHaveLength(1);
    expect(vehicleMatchesSearch(v[1], 'tipper')).toBe(true);
  });
});
