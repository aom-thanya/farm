import { describe, it, expect } from 'vitest';
import { cn, formatMoney, formatDate } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      expect(cn('px-2 py-1', { 'bg-blue-500': true, 'hidden': false })).toBe('px-2 py-1 bg-blue-500');
      // testing tailwind-merge override
      expect(cn('p-4', 'p-8')).toBe('p-8');
    });
  });

  describe('formatMoney', () => {
    it('formats number to Thai Baht currency', () => {
      const result = formatMoney(1500);
      // Intl.NumberFormat might return slightly different spacing/symbols depending on node version, 
      // but it should contain '1,500' and '฿' (or 'THB')
      expect(result).toMatch(/1,500/);
      expect(result).toMatch(/฿/);
    });

    it('formats 0 correctly', () => {
      const result = formatMoney(0);
      expect(result).toMatch(/0/);
    });
  });

  describe('formatDate', () => {
    it('formats date string to Thai format', () => {
      const dateStr = '2026-05-10T00:00:00.000Z';
      const result = formatDate(dateStr);
      // Expect some variation of 10 พ.ค. 2569 (Thai year is CE year + 543)
      expect(result).toContain('10');
      expect(result).toContain('พ.ค.');
      expect(result).toContain('2569');
    });

    it('returns empty string if no date provided', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });
  });
});
