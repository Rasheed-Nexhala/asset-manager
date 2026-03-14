/**
 * SKU Generation Utilities
 * Auto-generate SKUs from HSN codes for steel items with incrementing suffixes
 */

import { getSkusWithPrefix } from '../services/firebase/inventoryService';

/** Format for HSN-based SKU: HSN-XXX (e.g., 721699-001) */
const SKU_SUFFIX_LENGTH = 3;

/**
 * Sanitize HSN code for use as SKU prefix
 * Removes non-alphanumeric chars, keeps digits and hyphens
 */
function sanitizeHsnForPrefix(hsnCode: string): string {
  if (!hsnCode || typeof hsnCode !== 'string') return '';
  return hsnCode.trim().replace(/[^a-zA-Z0-9-]/g, '');
}

/**
 * Get the next available SKU suffix for a given HSN prefix
 * Queries existing SKUs starting with prefix and finds highest number
 *
 * @param hsnPrefix - Prefix like "721699" (will become "721699-")
 * @returns Next suffix number (1, 2, 3, ...)
 */
export async function getNextSkuSuffix(hsnPrefix: string): Promise<number> {
  const sanitized = sanitizeHsnForPrefix(hsnPrefix);
  if (!sanitized) return 1;

  const prefix = `${sanitized}-`;
  const existingSkus = await getSkusWithPrefix(prefix);

  if (existingSkus.length === 0) return 1;

  const suffixes = existingSkus
    .map((sku) => {
      const parts = sku.split('-');
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      return isNaN(num) ? 0 : num;
    })
    .filter((n) => n > 0);

  if (suffixes.length === 0) return 1;
  return Math.max(...suffixes) + 1;
}

/**
 * Generate SKU from steel master HSN code with auto-incrementing suffix
 * Example: HSN "721699" -> "721699-001", next call -> "721699-002"
 *
 * @param hsnCode - HSN/SAC code from steel master (e.g., "72169990" or "721699/80")
 * @returns Generated SKU (e.g., "721699-001")
 */
export async function generateSkuFromHsn(hsnCode: string): Promise<string> {
  const sanitized = sanitizeHsnForPrefix(hsnCode);
  if (!sanitized) {
    throw new Error('HSN code is required for SKU generation');
  }

  const suffix = await getNextSkuSuffix(sanitized);
  const suffixStr = suffix.toString().padStart(SKU_SUFFIX_LENGTH, '0');
  return `${sanitized}-${suffixStr}`;
}

/**
 * Validate and format SKU
 *
 * @param sku - SKU string to validate
 * @returns Validation result with optional error message
 */
export function validateSku(sku: string): { valid: boolean; error?: string } {
  if (!sku || typeof sku !== 'string') {
    return { valid: false, error: 'SKU is required' };
  }
  const trimmed = sku.trim();
  if (!trimmed) {
    return { valid: false, error: 'SKU cannot be empty' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'SKU is too long' };
  }
  if (/[^\w\-]/.test(trimmed)) {
    return { valid: false, error: 'SKU can only contain letters, numbers, hyphens, and underscores' };
  }
  return { valid: true };
}
