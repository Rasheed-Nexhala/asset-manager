import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  getSitesByManagerId,
  batchUpdateSites,
  findSitesWithInvalidManagers,
} from '../../services/firebase/siteService';
import { getAllUsers } from '../../services/firebase/userRoleService';
import type { Site } from '../../types/sites';

/**
 * Cleanup result interface
 */
export interface CleanupResult {
  managerId: string;
  sitesUpdated: number;
  siteIds: string[];
}

/**
 * Clean up site assignments for a specific invalid manager
 * Used when a manager is deactivated, role changes, or user is deleted
 */
export const cleanupManagerAssignments = createAsyncThunk(
  'sites/cleanupManagerAssignments',
  async (managerId: string, { rejectWithValue }) => {
    try {
      // Find all sites assigned to this manager
      const sites = await getSitesByManagerId(managerId);

      if (sites.length === 0) {
        return {
          managerId,
          sitesUpdated: 0,
          siteIds: [],
        } as CleanupResult;
      }

      // Prepare batch updates to unassign manager
      const updates = sites.map((site) => ({
        siteId: site.id,
        data: {
          managerId: null,
          managerName: null,
        },
      }));

      // Execute batch update
      await batchUpdateSites(updates);

      return {
        managerId,
        sitesUpdated: sites.length,
        siteIds: sites.map((site) => site.id),
      } as CleanupResult;
    } catch (error: any) {
      console.error(`Error cleaning up manager assignments for ${managerId}:`, error);
      return rejectWithValue(
        error.message || `Failed to cleanup manager assignments for ${managerId}`
      );
    }
  }
);

/**
 * Validate and cleanup all invalid manager assignments across all sites
 * This performs a full scan to find and fix any orphaned or invalid manager references
 */
export const validateAllManagerAssignments = createAsyncThunk(
  'sites/validateAllManagerAssignments',
  async (_, { rejectWithValue }) => {
    try {
      // Get all users to determine valid SiteManagers
      const allUsers = await getAllUsers();

      // Build set of valid manager IDs (active SiteManagers only; exclude deleted users)
      const validManagerIds = new Set<string>();
      allUsers.forEach((user) => {
        if (
          user.role === 'SiteManager' &&
          user.isActive &&
          !user.isDeleted
        ) {
          validManagerIds.add(user.id);
        }
      });

      // Find all sites with invalid managers
      const invalidSites = await findSitesWithInvalidManagers(validManagerIds);

      if (invalidSites.length === 0) {
        return {
          sitesUpdated: 0,
          siteIds: [],
          managersCleaned: [],
        };
      }

      // Prepare batch updates to unassign invalid managers
      const updates = invalidSites.map((site) => ({
        siteId: site.id,
        data: {
          managerId: null,
          managerName: null,
        },
      }));

      // Execute batch update
      await batchUpdateSites(updates);

      // Group by managerId for reporting
      const managersCleaned = Array.from(
        new Set(invalidSites.map((site) => site.managerId).filter(Boolean))
      ) as string[];

      return {
        sitesUpdated: invalidSites.length,
        siteIds: invalidSites.map((site) => site.id),
        managersCleaned,
      };
    } catch (error: any) {
      console.error('Error validating all manager assignments:', error);
      return rejectWithValue(
        error.message || 'Failed to validate all manager assignments'
      );
    }
  }
);
