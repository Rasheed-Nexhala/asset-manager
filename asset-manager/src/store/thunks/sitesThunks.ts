import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createSite as createSiteService,
  updateSite as updateSiteService,
  getSites,
  checkSiteNameExists,
  findSiteByManagerId,
  getSite,
} from '../../services/firebase/siteService';
import { getAllUsers } from '../../services/firebase/userRoleService';
import type { CreateSiteData, UpdateSiteData, Site } from '../../types/sites';
import type { SiteFormData } from '../../types/sites';

/**
 * Fetch all sites
 */
export const fetchSites = createAsyncThunk(
  'sites/fetchSites',
  async (_, { rejectWithValue }) => {
    try {
      const sites = await getSites();
      return sites;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch sites');
    }
  }
);

/**
 * Create a new site
 */
export const createSite = createAsyncThunk(
  'sites/createSite',
  async (formData: SiteFormData, { rejectWithValue }) => {
    try {
      // Validate site name uniqueness
      const nameExists = await checkSiteNameExists(formData.name);
      if (nameExists) {
        return rejectWithValue('Site name already exists. Please choose a different name.');
      }

      // Handle manager assignment
      let managerName: string | null = null;
      if (formData.managerId) {
        // Check if manager is already assigned to another site
        const existingSite = await findSiteByManagerId(formData.managerId);
        if (existingSite) {
          // Remove manager from previous site
          await updateSiteService(existingSite.id, {
            managerId: null,
            managerName: null,
          });
        }

        // Get manager name from users collection
        const users = await getAllUsers();
        const manager = users.find((user) => user.id === formData.managerId);
        if (manager) {
          managerName = manager.displayName || manager.email || null;
        }
      }

      const createData: CreateSiteData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        address: formData.address.trim(),
        contactNumber: formData.contactNumber.trim() || undefined,
        managerId: formData.managerId || null,
        managerName,
        status: formData.status,
      };

      const siteId = await createSiteService(createData);
      
      // Fetch the created site to get full data including timestamps
      const createdSite = await getSite(siteId);
      if (!createdSite) {
        throw new Error('Failed to retrieve created site');
      }

      return createdSite;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create site');
    }
  }
);

/**
 * Update an existing site
 */
export const updateSite = createAsyncThunk(
  'sites/updateSite',
  async (
    { siteId, formData }: { siteId: string; formData: SiteFormData },
    { rejectWithValue }
  ) => {
    try {
      // Validate site name uniqueness (excluding current site)
      const nameExists = await checkSiteNameExists(formData.name, siteId);
      if (nameExists) {
        return rejectWithValue('Site name already exists. Please choose a different name.');
      }

      // Handle manager assignment
      let managerName: string | null = null;
      if (formData.managerId) {
        // Check if manager is already assigned to another site
        const existingSite = await findSiteByManagerId(formData.managerId, siteId);
        if (existingSite) {
          // Remove manager from previous site
          await updateSiteService(existingSite.id, {
            managerId: null,
            managerName: null,
          });
        }

        // Get manager name from users collection
        const users = await getAllUsers();
        const manager = users.find((user) => user.id === formData.managerId);
        if (manager) {
          managerName = manager.displayName || manager.email || null;
        }
      }

      const updateData: UpdateSiteData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        address: formData.address.trim(),
        contactNumber: formData.contactNumber.trim() || undefined,
        managerId: formData.managerId || null,
        managerName,
        status: formData.status,
      };

      await updateSiteService(siteId, updateData);
      
      // Fetch the updated site to get full data including timestamps
      const updatedSite = await getSite(siteId);
      if (!updatedSite) {
        throw new Error('Failed to retrieve updated site');
      }

      return updatedSite;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update site');
    }
  }
);
