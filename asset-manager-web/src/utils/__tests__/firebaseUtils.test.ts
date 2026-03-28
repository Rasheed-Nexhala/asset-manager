import { describe, it, expect } from 'vitest';
import { timestampToISOString, isoStringToDate, serializeDocumentSnapshot } from '../firebaseUtils';
import { Timestamp } from 'firebase/firestore';

describe('firebaseUtils', () => {
  describe('timestampToISOString', () => {
    it('should convert Firebase Timestamp to ISO string', () => {
      const mockDate = new Date('2023-01-01T10:00:00.000Z');
      const mockTimestamp = {
        toDate: () => mockDate,
      } as Timestamp;

      const result = timestampToISOString(mockTimestamp);
      expect(result).toBe('2023-01-01T10:00:00.000Z');
    });

    it('should handle null/undefined timestamps with fallback to current time', () => {
      const nullResult = timestampToISOString(null);
      const undefinedResult = timestampToISOString(undefined);
      expect(nullResult).toBeDefined();
      expect(undefinedResult).toBeDefined();
      expect(nullResult).toEqual(undefinedResult);
      expect(new Date(nullResult).getTime()).not.toBeNaN();
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-06-15T14:30:00.000Z');
      const result = timestampToISOString(date);
      expect(result).toBe('2024-06-15T14:30:00.000Z');
    });
  });

  describe('isoStringToDate', () => {
    it('should convert ISO string back to Date object', () => {
      const isoString = '2023-01-01T10:00:00.000Z';
      const result = isoStringToDate(isoString);

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe(isoString);
    });

    it('should handle null strings', () => {
      expect(isoStringToDate(null)).toBe(null);
    });
  });

  describe('serializeDocumentSnapshot', () => {
    it('should serialize a DocumentSnapshot', () => {
      const mockDocSnapshot = {
        id: 'doc123',
        exists: () => true,
        data: () => ({ name: 'Test Site', status: 'active' }),
        ref: { path: 'sites/doc123' },
      } as any;

      const result = serializeDocumentSnapshot(mockDocSnapshot);

      expect(result).toEqual({
        id: 'doc123',
        data: { name: 'Test Site', status: 'active' },
        ref: 'sites/doc123',
      });
    });

    it('should handle null or non-existent documents', () => {
      const mockDocSnapshot = {
        exists: () => false,
      } as any;

      expect(serializeDocumentSnapshot(mockDocSnapshot)).toBe(null);
      expect(serializeDocumentSnapshot(null)).toBe(null);
    });
  });
});
