import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNextSkuSuffix, generateSkuFromHsn, validateSku } from '../skuGenerationUtils';
import { getSkusWithPrefix } from '../../services/firebase/inventoryService';

vi.mock('../../services/firebase/inventoryService', () => ({
  getSkusWithPrefix: vi.fn(),
}));

const mockGetSkusWithPrefix = vi.mocked(getSkusWithPrefix);

describe('skuGenerationUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNextSkuSuffix', () => {
    it('should return 1 when no existing SKUs with prefix', async () => {
      mockGetSkusWithPrefix.mockResolvedValue([]);

      const result = await getNextSkuSuffix('721699');
      expect(result).toBe(1);
      expect(mockGetSkusWithPrefix).toHaveBeenCalledWith('721699-');
    });

    it('should return next suffix when existing SKUs exist', async () => {
      mockGetSkusWithPrefix.mockResolvedValue(['721699-001', '721699-002']);

      const result = await getNextSkuSuffix('721699');
      expect(result).toBe(3);
    });

    it('should return 2 when only 721699-001 exists', async () => {
      mockGetSkusWithPrefix.mockResolvedValue(['721699-001']);

      const result = await getNextSkuSuffix('721699');
      expect(result).toBe(2);
    });

    it('should handle non-sequential suffixes and return max + 1', async () => {
      mockGetSkusWithPrefix.mockResolvedValue([
        '721699-001',
        '721699-005',
        '721699-003',
      ]);

      const result = await getNextSkuSuffix('721699');
      expect(result).toBe(6);
    });

    it('should return 1 for empty or invalid prefix', async () => {
      mockGetSkusWithPrefix.mockResolvedValue([]);

      const resultEmpty = await getNextSkuSuffix('');
      expect(resultEmpty).toBe(1);
      expect(mockGetSkusWithPrefix).not.toHaveBeenCalled();
    });
  });

  describe('generateSkuFromHsn', () => {
    it('should generate SKU with 001 suffix when no existing SKUs', async () => {
      mockGetSkusWithPrefix.mockResolvedValue([]);

      const result = await generateSkuFromHsn('721699');
      expect(result).toBe('721699-001');
    });

    it('should generate SKU with incremented suffix when existing SKUs', async () => {
      mockGetSkusWithPrefix.mockResolvedValue(['721699-001', '721699-002']);

      const result = await generateSkuFromHsn('721699');
      expect(result).toBe('721699-003');
    });

    it('should sanitize HSN code by removing non-alphanumeric chars', async () => {
      mockGetSkusWithPrefix.mockResolvedValue([]);

      const result = await generateSkuFromHsn('721699/80');
      expect(result).toBe('72169980-001');
    });

    it('should throw when HSN code is empty', async () => {
      await expect(generateSkuFromHsn('')).rejects.toThrow(
        'HSN code is required for SKU generation'
      );
    });

    it('should throw when HSN code is only whitespace', async () => {
      await expect(generateSkuFromHsn('   ')).rejects.toThrow(
        'HSN code is required for SKU generation'
      );
    });

    it('should pad suffix with leading zeros', async () => {
      mockGetSkusWithPrefix.mockResolvedValue(['721699-099']);

      const result = await generateSkuFromHsn('721699');
      expect(result).toBe('721699-100');
    });
  });

  describe('validateSku', () => {
    it('should return valid for correct SKU', () => {
      expect(validateSku('721699-001')).toEqual({ valid: true });
      expect(validateSku('ABC-123')).toEqual({ valid: true });
      expect(validateSku('sku_001')).toEqual({ valid: true });
    });

    it('should return invalid for empty or missing SKU', () => {
      expect(validateSku('')).toEqual({
        valid: false,
        error: 'SKU is required',
      });
      expect(validateSku('   ')).toEqual({
        valid: false,
        error: 'SKU cannot be empty',
      });
    });

    it('should return invalid for SKU that is too long', () => {
      const longSku = 'a'.repeat(51);
      expect(validateSku(longSku)).toEqual({
        valid: false,
        error: 'SKU is too long',
      });
    });

    it('should return invalid for SKU with invalid characters', () => {
      expect(validateSku('721699@001')).toEqual({
        valid: false,
        error:
          'SKU can only contain letters, numbers, hyphens, and underscores',
      });
      expect(validateSku('721699 001')).toEqual({
        valid: false,
        error:
          'SKU can only contain letters, numbers, hyphens, and underscores',
      });
    });
  });
});
