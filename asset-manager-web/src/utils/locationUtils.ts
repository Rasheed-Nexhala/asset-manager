export type LocationType = 'store' | 'site' | 'maintenance';

export const getLocationId = (locationType: LocationType, id?: string): string => {
  switch (locationType) {
    case 'store':
      return 'store';
    case 'site':
      return id ? `site_${id}` : '';
    case 'maintenance':
      return 'maintenance';
  }
};

/**
 * Derive locationType from locationId.
 * Required for Firestore queries: Site Managers can only read docs where locationType == 'site',
 * so the query must include locationType for Firestore to authorize the request.
 */
export const getLocationTypeFromId = (locationId: string): LocationType | null => {
  if (locationId === 'store') return 'store';
  if (locationId.startsWith('site_')) return 'site';
  if (locationId === 'maintenance') return 'maintenance';
  return null;
};
