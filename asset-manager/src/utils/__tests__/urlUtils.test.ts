import { isSafeOpenableUrl } from '../urlUtils';

describe('isSafeOpenableUrl', () => {
  it('allows https URLs', () => {
    expect(isSafeOpenableUrl('https://example.com/doc.pdf')).toBe(true);
    expect(isSafeOpenableUrl('HTTPS://example.com')).toBe(true);
  });

  it('allows http URLs', () => {
    expect(isSafeOpenableUrl('http://example.com/doc.pdf')).toBe(true);
    expect(isSafeOpenableUrl('HTTP://localhost/file')).toBe(true);
  });

  it('allows file URLs', () => {
    expect(isSafeOpenableUrl('file:///path/to/doc.pdf')).toBe(true);
    expect(isSafeOpenableUrl('file://localhost/path')).toBe(true);
  });

  it('rejects javascript URLs', () => {
    expect(isSafeOpenableUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeOpenableUrl('JAVASCRIPT:void(0)')).toBe(false);
  });

  it('rejects data URLs', () => {
    expect(isSafeOpenableUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeOpenableUrl('data:application/pdf;base64,abc')).toBe(false);
  });

  it('rejects vbscript and other schemes', () => {
    expect(isSafeOpenableUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeOpenableUrl('tel:1234567890')).toBe(false);
  });

  it('rejects empty or invalid input', () => {
    expect(isSafeOpenableUrl('')).toBe(false);
    expect(isSafeOpenableUrl('   ')).toBe(false);
    expect(isSafeOpenableUrl(null as unknown as string)).toBe(false);
    expect(isSafeOpenableUrl(undefined as unknown as string)).toBe(false);
  });
});
