/**
 * Unit tests for date serialization utilities
 */
import { describe, it, expect } from 'vitest';
import {
  dateToIso,
  isoToDate,
  filtersToStore,
  filtersToUI,
} from '../dateSerialization';

describe('dateToIso', () => {
  it('returns null for null', () => {
    expect(dateToIso(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(dateToIso(undefined)).toBeNull();
  });

  it('returns ISO string for Date', () => {
    const date = new Date('2025-03-14T10:30:00.000Z');
    const result = dateToIso(date);
    expect(result).toBe('2025-03-14T10:30:00.000Z');
  });

  it('returns string unchanged when input is string', () => {
    const iso = '2025-03-14T10:30:00.000Z';
    expect(dateToIso(iso)).toBe(iso);
  });
});

describe('isoToDate', () => {
  it('returns null for null', () => {
    expect(isoToDate(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(isoToDate(undefined)).toBeNull();
  });

  it('returns Date for valid ISO string', () => {
    const iso = '2025-03-14T10:30:00.000Z';
    const result = isoToDate(iso);
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe(iso);
  });

  it('returns null for invalid string', () => {
    expect(isoToDate('not-a-date')).toBeNull();
    expect(isoToDate('')).toBeNull();
  });

  it('returns Date unchanged when input is Date', () => {
    const date = new Date('2025-03-14T10:30:00.000Z');
    const result = isoToDate(date);
    expect(result).toBe(date);
  });
});

describe('filtersToStore', () => {
  it('converts Date filters to ISO strings', () => {
    const startDate = new Date('2025-03-01T00:00:00.000Z');
    const endDate = new Date('2025-03-14T23:59:59.999Z');
    const result = filtersToStore({ startDate, endDate });
    expect(result.startDate).toBe('2025-03-01T00:00:00.000Z');
    expect(result.endDate).toBe('2025-03-14T23:59:59.999Z');
  });

  it('returns null for null/undefined dates', () => {
    const result = filtersToStore({});
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it('preserves other filter properties', () => {
    const result = filtersToStore({
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-14'),
      type: 'transfer' as const,
    });
    expect(result.type).toBe('transfer');
  });
});

describe('filtersToUI', () => {
  it('converts ISO string filters to Date', () => {
    const startDate = '2025-03-01T00:00:00.000Z';
    const endDate = '2025-03-14T23:59:59.999Z';
    const result = filtersToUI({ startDate, endDate });
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate?.toISOString()).toBe(startDate);
    expect(result.endDate).toBeInstanceOf(Date);
    expect(result.endDate?.toISOString()).toBe(endDate);
  });

  it('returns null for null/undefined dates', () => {
    const result = filtersToUI({});
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it('preserves other filter properties', () => {
    const result = filtersToUI({
      startDate: '2025-03-01T00:00:00.000Z',
      endDate: '2025-03-14T23:59:59.999Z',
      type: 'transfer' as const,
    });
    expect(result.type).toBe('transfer');
  });
});
