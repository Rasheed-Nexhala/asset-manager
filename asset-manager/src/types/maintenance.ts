import { Timestamp } from 'firebase/firestore';

/**
 * Maintenance Status Lifecycle
 *
 * pending -> Items added to maintenance (default state)
 * partial_return -> Some items returned, some still in maintenance
 * returned -> All items returned to central store inventory
 * written_off -> Permanently removed from inventory
 */
export type MaintenanceStatus =
  | 'pending'
  | 'partial_return'
  | 'returned'
  | 'written_off';

/**
 * Issue Type Categories
 * 
 * Categorizes the type of damage or issue with the equipment
 */
export type IssueType = 
  | 'motor_electrical'
  | 'physical_damage'
  | 'wear_and_tear'
  | 'missing_parts'
  | 'other';

/**
 * Write-Off Reason Categories
 * 
 * Categorizes why an item is being permanently removed from inventory
 */
export type WriteOffReason = 
  | 'beyond_repair'
  | 'high_repair_cost'
  | 'obsolete'
  | 'lost_stolen'
  | 'other';

/**
 * Photo Metadata
 * 
 * Stores information about maintenance photos uploaded to Firebase Storage
 */
export interface MaintenancePhoto {
  url: string;
  fileName: string;
  uploadedAt: Date | string;
}

/**
 * Status Update Notes
 * 
 * Tracks status changes and notes throughout the maintenance lifecycle
 */
export interface MaintenanceUpdate {
  note: string;
  addedBy: string;
  addedByName: string;
  addedAt: Date | string;
}

/**
 * Firestore Document Structure
 * 
 * Uses Timestamp objects for date fields (Firestore native format)
 * This is the structure stored in Firestore database
 */
export interface MaintenanceFirestore {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  
  // Issue details
  issueType: IssueType;
  issueDescription: string;
  reportedBy: string;
  reportedByName: string;
  photos: MaintenancePhoto[];
  
  // Status tracking
  status: MaintenanceStatus;
  updates: MaintenanceUpdate[];
  
  // Return fields (populated when returned)
  returnedAt: Timestamp | null;
  returnedQuantity: number | null;
  repairSummary: string | null;
  repairCost: number | null;
  repairedBy: string | null;
  
  // Write-off fields (populated when written off)
  writtenOffAt: Timestamp | null;
  writeOffReason: WriteOffReason | null;
  writeOffExplanation: string | null;
  
  // Metadata
  addedBy: string;
  addedByName: string;
  addedAt: Timestamp;
  updatedAt: Timestamp;
  
  // Source tracking (tracks if item came from a return request)
  sourceRequestId?: string | null;
  sourceReturnDate?: Timestamp | null;
}

/**
 * Redux State Structure
 * 
 * Dates converted to ISO strings for Redux serialization
 * This is the structure stored in Redux store
 */
export interface Maintenance extends Omit<MaintenanceFirestore, 'addedAt' | 'updatedAt' | 'returnedAt' | 'writtenOffAt' | 'sourceReturnDate'> {
  addedAt: string;
  updatedAt: string;
  returnedAt: string | null;
  writtenOffAt: string | null;
  sourceReturnDate: string | null;
}

/**
 * Form Data for Adding to Maintenance
 * 
 * Used when creating a new maintenance record
 */
export interface AddToMaintenanceData {
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  issueType: IssueType;
  issueDescription?: string;
  reportedBy?: string;
  reportedByName?: string;
  photos?: MaintenancePhoto[];
  sourceRequestId?: string; // Links to source request if item came from return
  sourceReturnDate?: Date;  // When item was returned from site
}

/**
 * Form Data for Returning from Maintenance
 * 
 * Used when returning repaired items back to inventory
 * Supports partial returns (can return less than total quantity)
 */
export interface ReturnFromMaintenanceData {
  returnQuantity: number;
  repairSummary?: string;
  repairCost?: number;
  repairedBy?: string;
}

/**
 * Form Data for Write-Off
 * 
 * Used when permanently removing items from inventory
 * This action is irreversible
 */
export interface WriteOffData {
  writeOffQuantity: number;
  reason: WriteOffReason;
  explanation?: string;
}

/**
 * Issue Type Configuration for UI
 * 
 * Defines display labels and descriptions for issue types
 */
export interface IssueTypeConfig {
  value: IssueType;
  label: string;
  description?: string;
}

/**
 * Write-Off Reason Configuration for UI
 * 
 * Defines display labels and descriptions for write-off reasons
 */
export interface WriteOffReasonConfig {
  value: WriteOffReason;
  label: string;
  description?: string;
}
