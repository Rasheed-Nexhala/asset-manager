import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createSite as createSiteService,
  updateSite as updateSiteService,
  getSites,
  checkSiteNameExists,
  getSite,
} from '../../services/firebase/siteService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { CreateSiteData, UpdateSiteData, Site } from '../../types/sites';
import type { SiteFormData } from '../../types/sites';
import type { RootState } from '../index';

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
  async (formData: SiteFormData, { getState, rejectWithValue }) => {
    try {
      // Validate site name uniqueness
      const nameExists = await checkSiteNameExists(formData.name);
      if (nameExists) {
        return rejectWithValue('Site name already exists. Please choose a different name.');
      }

      // Handle manager assignment (same manager may manage multiple sites)
      let managerName: string | null = null;
      if (formData.managerId) {
        const managerDoc = await getDoc(doc(db, 'users', formData.managerId));
        if (managerDoc.exists()) {
          const data = managerDoc.data();
          managerName = data.displayName || data.email || null;
        }
      }

      const state = getState() as RootState;
      const { user, userRole } = state.auth;
      const userId = user?.uid ?? null;
      const userName = user?.displayName ?? user?.email ?? 'Unknown';
      const userRoleType = userRole?.role ?? 'Admin';

      const desc = (formData.description ?? '').trim();
      const contact = (formData.contactNumber ?? '').trim();
      const createData: CreateSiteData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        managerId: formData.managerId || null,
        managerName,
        status: formData.status,
        ...(desc && { description: desc }),
        ...(contact && { contactNumber: contact }),
        ...(userId && { createdBy: userId, createdByName: userName, createdByRole: userRoleType }),
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
    { getState, rejectWithValue }
  ) => {
    try {
      const stateBefore = getState() as RootState;
      const isSuperAdmin = stateBefore.auth.userRole?.role === 'SuperAdmin';

      // Handle manager assignment (same manager may manage multiple sites)
      let managerName: string | null = null;
      if (formData.managerId) {
        const managerDoc = await getDoc(doc(db, 'users', formData.managerId));
        if (managerDoc.exists()) {
          const data = managerDoc.data();
          managerName = data.displayName || data.email || null;
        }
      }

      const state = stateBefore;
      const { user, userRole } = state.auth;
      const userId = user?.uid ?? null;
      const userName = user?.displayName ?? user?.email ?? 'Unknown';
      const userRoleType = userRole?.role ?? 'Admin';

      const desc = (formData.description ?? '').trim();
      const contact = (formData.contactNumber ?? '').trim();
      const isInactive = formData.status === 'inactive';
      const trimmedName = formData.name.trim();
      const updateData: UpdateSiteData = {
        address: formData.address.trim(),
        managerId: isInactive ? null : (formData.managerId || null),
        managerName: isInactive ? null : managerName,
        status: formData.status,
        ...(desc && { description: desc }),
        ...(contact && { contactNumber: contact }),
        ...(userId && { updatedBy: userId, updatedByName: userName, updatedByRole: userRoleType }),
      };

      if (isSuperAdmin) {
        let previousName =
          state.sites.sites.find((s) => s.id === siteId)?.name?.trim() ?? '';
        if (previousName === '') {
          const doc = await getSite(siteId);
          previousName = doc?.name?.trim() ?? '';
        }
        if (trimmedName !== previousName) {
          const nameTaken = await checkSiteNameExists(trimmedName, siteId);
          if (nameTaken) {
            return rejectWithValue(
              'Site name already exists. Please choose a different name.'
            );
          }
        }
        updateData.name = trimmedName;
      }
      // Note: when status is inactive, manager is always removed (inactive sites cannot have a manager)

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
