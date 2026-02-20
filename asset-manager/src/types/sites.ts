import { Timestamp } from 'firebase/firestore';

/**
 * Site status types
 */
export type SiteStatus = 'active' | 'inactive';

/**
 * Site document structure in Firestore (with Firebase Timestamps)
 * Note: id is the Firebase document ID (not stored as a field)
 */
export interface FirestoreSite {
  id: string;                    // Firebase-generated document ID
  name: string;                  // Required, unique
  description?: string;          // Optional project description
  address: string;               // Required location
  contactNumber?: string;        // Optional phone number
  managerId?: string | null;     // Optional Site Manager user ID
  managerName?: string | null;   // Denormalized manager name
  status: SiteStatus;           // Site status
  createdAt: Timestamp;          // Creation timestamp
  updatedAt: Timestamp;          // Last modified timestamp
}

/**
 * Site document structure for Redux store (serialized timestamps)
 * This version uses ISO strings for timestamps to be Redux-serializable
 */
export interface Site {
  id: string;                    // Firebase-generated document ID
  name: string;                  // Required, unique
  description?: string;          // Optional project description
  address: string;               // Required location
  contactNumber?: string;        // Optional phone number
  managerId?: string | null;     // Optional Site Manager user ID
  managerName?: string | null;   // Denormalized manager name
  status: SiteStatus;           // Site status
  createdAt: string | null;      // Serialized creation timestamp (ISO string)
  updatedAt: string | null;      // Serialized last modified timestamp (ISO string)
}

/**
 * Form data for creating/editing sites
 */
export interface SiteFormData {
  name: string;
  description: string;
  address: string;
  contactNumber: string;
  managerId: string | null;
  status: SiteStatus;
}

/**
 * Data required to create a new site
 */
export interface CreateSiteData {
  name: string;
  description?: string;
  address: string;
  contactNumber?: string;
  managerId?: string | null;
  managerName?: string | null;
  status: SiteStatus;
  /** User who created the site (for activity log) */
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
}

/**
 * Data for updating an existing site
 */
export interface UpdateSiteData {
  name?: string;
  description?: string;
  address?: string;
  contactNumber?: string;
  managerId?: string | null;
  managerName?: string | null;
  status?: SiteStatus;
  /** User who updated the site (for activity log) */
  updatedBy?: string;
  updatedByName?: string;
  updatedByRole?: string;
}
