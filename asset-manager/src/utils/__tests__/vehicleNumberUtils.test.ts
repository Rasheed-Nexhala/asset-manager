import { normalizeVehicleNumber } from '../vehicleNumberUtils';

describe('normalizeVehicleNumber', () => {
  it('trims and lowercases', () => {
    expect(normalizeVehicleNumber('  KA-01-AB-999  ')).toBe('ka-01-ab-999');
  });

  it('handles empty string', () => {
    expect(normalizeVehicleNumber('   ')).toBe('');
  });
});
