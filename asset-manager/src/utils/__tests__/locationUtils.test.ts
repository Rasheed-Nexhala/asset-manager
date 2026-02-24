import { getLocationId, getLocationTypeFromId } from '../locationUtils';

describe('locationUtils', () => {
  describe('getLocationId', () => {
    it('returns "store" for store location type', () => {
      expect(getLocationId('store')).toBe('store');
    });

    it('returns "site_<id>" for site with id', () => {
      expect(getLocationId('site', 'abc123')).toBe('site_abc123');
    });

    it('returns empty string for site without id', () => {
      expect(getLocationId('site')).toBe('');
    });

    it('returns "maintenance" for maintenance location type', () => {
      expect(getLocationId('maintenance')).toBe('maintenance');
    });
  });

  describe('getLocationTypeFromId', () => {
    it('returns "store" for store id', () => {
      expect(getLocationTypeFromId('store')).toBe('store');
    });

    it('returns "site" for site_ prefixed id', () => {
      expect(getLocationTypeFromId('site_abc123')).toBe('site');
    });

    it('returns "maintenance" for maintenance id', () => {
      expect(getLocationTypeFromId('maintenance')).toBe('maintenance');
    });

    it('returns null for unknown id', () => {
      expect(getLocationTypeFromId('unknown')).toBe(null);
    });
  });
});
