import type { User } from 'firebase/auth';
import type { RootState } from '../../store';
import type { Site } from '../../types/sites';
import type { UserRoleData } from '../../types/roles';

/** Minimal Redux slice for Site Manager + one managed active site (used by inventory supervisor flows). */
export function createSiteManagerPreloadedState(overrides: Partial<RootState> = {}): Partial<RootState> {
  const uid = 'test-site-manager-uid';
  const siteId = 'test-site-id';

  const user = {
    uid,
    displayName: 'Site Manager',
    email: 'sm@test.com',
  } as User;

  const userRole: UserRoleData = {
    role: 'SiteManager',
    isActive: true,
    permissions: ['canManageInventory'],
  };

  const site: Site = {
    id: siteId,
    name: 'Test Site',
    address: '1 Test St',
    managerId: uid,
    status: 'active',
    createdAt: null,
    updatedAt: null,
  };

  const base: Partial<RootState> = {
    auth: {
      user,
      userRole,
      isAuthenticated: true,
      isLoading: false,
      isRoleLoading: false,
      authInitialized: true,
      error: null,
    },
    sites: {
      sites: [site],
      isLoading: false,
      error: null,
      searchQuery: '',
      validationLoading: false,
      lastValidationAt: null,
      activeManagedSiteId: siteId,
    },
  };

  return { ...base, ...overrides };
}

export const SITE_MANAGER_TEST_IDS = {
  userId: 'test-site-manager-uid',
  siteId: 'test-site-id',
} as const;
